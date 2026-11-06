import { supabaseAdmin } from '../config/supabase.js';

export interface YouTubeVideoMetadata {
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  isAvailable: boolean;
}

export const youtubeService = {
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(url);
      if (match?.[1]) return match[1];
    }
    return null;
  },

  extractPlaylistId(url: string): string | null {
    const match = /[?&]list=([^&\n?#]+)/.exec(url);
    return match?.[1] || null;
  },

  /**
   * Resolves a YouTube video, fetching metadata from cache or via zero-quota oEmbed fallback
   */
  async resolveVideo(urlOrId: string): Promise<YouTubeVideoMetadata> {
    const videoId = this.extractVideoId(urlOrId) || urlOrId.trim();
    if (!videoId) throw new Error('Invalid YouTube video URL or ID');

    // 1. Check local DB cache first (saves 100% of quota)
    const { data: cached } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('youtube_video_id', videoId)
      .maybeSingle();

    if (cached) {
      return {
        youtubeVideoId: cached.youtube_video_id,
        title: cached.title,
        channelTitle: cached.channel_title,
        thumbnailUrl: cached.thumbnail_url,
        durationSeconds: cached.duration_seconds,
        isAvailable: cached.is_available,
      };
    }

    // 2. Fetch fresh metadata:
    // If YOUTUBE_API_KEY is available, try Data API v3; otherwise use official zero-quota oEmbed fallback
    let metadata: YouTubeVideoMetadata | null = null;
    const apiKey = process.env['YOUTUBE_API_KEY'];

    if (apiKey) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${videoId}&key=${apiKey}`,
        );
        const data = await res.json() as any;
        const item = data.items?.[0];

        if (item) {
          const durationIso = item.contentDetails?.duration || 'PT0S';
          const durationSec = this.parseIsoDuration(durationIso);
          const isPlayable = item.status?.uploadStatus === 'processed' && item.status?.privacyStatus === 'public';

          metadata = {
            youtubeVideoId: videoId,
            title: item.snippet?.title || 'YouTube Video',
            channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
            thumbnailUrl:
              item.snippet?.thumbnails?.maxres?.url ||
              item.snippet?.thumbnails?.high?.url ||
              `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            durationSeconds: durationSec,
            isAvailable: isPlayable,
          };
        }
      } catch (err) {
        console.warn('[youtubeService] Data API v3 lookup failed, falling back to oEmbed:', err);
      }
    }

    // 3. Zero-quota oEmbed fallback (official YouTube standard, no quota cost)
    if (!metadata) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await fetch(oembedUrl);
        if (!res.ok) {
          throw new Error('Video is unavailable, deleted or private');
        }
        const oembed = await res.json() as any;

        metadata = {
          youtubeVideoId: videoId,
          title: oembed.title || 'YouTube Video',
          channelTitle: oembed.author_name || 'YouTube Channel',
          thumbnailUrl: oembed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          durationSeconds: 0, // oEmbed doesn't include duration, will be reported by player iframe on client
          isAvailable: true,
        };
      } catch (err) {
        // If oEmbed also fails, the video is unavailable
        metadata = {
          youtubeVideoId: videoId,
          title: 'Unavailable Video',
          channelTitle: 'Unknown',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          durationSeconds: 0,
          isAvailable: false,
        };
      }
    }

    // 4. Save into videos cache
    await supabaseAdmin
      .from('videos')
      .upsert(
        {
          youtube_video_id: metadata.youtubeVideoId,
          title: metadata.title,
          channel_title: metadata.channelTitle,
          thumbnail_url: metadata.thumbnailUrl,
          duration_seconds: metadata.durationSeconds,
          is_available: metadata.isAvailable,
          last_refreshed_at: new Date().toISOString(),
        },
        { onConflict: 'youtube_video_id' },
      );

    return metadata;
  },

  /**
   * Import playlist items
   */
  async getPlaylistVideos(playlistUrlOrId: string): Promise<{ title: string; videos: YouTubeVideoMetadata[] }> {
    const playlistId = this.extractPlaylistId(playlistUrlOrId) || playlistUrlOrId.trim();
    if (!playlistId) throw new Error('Invalid YouTube playlist URL or ID');

    const apiKey = process.env['YOUTUBE_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'Playlist automatic import requires YOUTUBE_API_KEY configured in server. You can still paste individual lecture URLs without an API key.',
      );
    }

    // 1. Fetch playlist title
    const pRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`,
    );
    const pData = await pRes.json() as any;
    const playlistTitle = pData.items?.[0]?.snippet?.title || 'Imported Course';

    // 2. Fetch items (up to 50 items to respect quota)
    const itemsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
    );
    const itemsData = await itemsRes.json() as any;

    const videos: YouTubeVideoMetadata[] = [];
    for (const item of itemsData.items || []) {
      const vId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!vId) continue;

      const videoMeta: YouTubeVideoMetadata = {
        youtubeVideoId: vId,
        title: item.snippet?.title || 'Lecture',
        channelTitle: item.snippet?.channelTitle || 'Channel',
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ||
          `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
        durationSeconds: 0,
        isAvailable: true,
      };

      // Save into cache
      await supabaseAdmin
        .from('videos')
        .upsert(
          {
            youtube_video_id: videoMeta.youtubeVideoId,
            title: videoMeta.title,
            channel_title: videoMeta.channelTitle,
            thumbnail_url: videoMeta.thumbnailUrl,
            duration_seconds: 0,
            is_available: true,
            last_refreshed_at: new Date().toISOString(),
          },
          { onConflict: 'youtube_video_id' },
        );

      videos.push(videoMeta);
    }

    return {
      title: playlistTitle,
      videos,
    };
  },

  parseIsoDuration(isoDuration: string): number {
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(isoDuration);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  },
};
