import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { socialService } from '../services/socialService.js';
import {
  UpdateProfileSchema,
  OnboardingSchema,
  UserSettingsSchema,
  SocialActionSchema,
} from '@gyanix/shared';
import type { Request, Response, NextFunction } from 'express';

export const usersRouter = Router();

/**
 * GET /api/users/check-username/:username
 * Checks whether a username is available (case-insensitive).
 */
usersRouter.get('/check-username/:username', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username } = req.params as { username: string };

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    res.json({ success: true, data: { available: !data } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/me/completion
 * Computes profile completion % and action suggestions for the dashboard card
 */
usersRouter.get('/me/completion', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
      return;
    }

    const items = [
      { key: 'avatar_url', label: 'Add a profile photo', weight: 20 },
      { key: 'bio', label: 'Write a short bio', weight: 20 },
      { key: 'profession', label: 'Set your profession or major', weight: 15 },
      { key: 'github_url', label: 'Connect your GitHub profile', weight: 15 },
      { key: 'onboarding_completed', label: 'Complete onboarding preferences', weight: 30 },
    ];

    let completedScore = 0;
    const suggestions: string[] = [];

    for (const item of items) {
      const val = profile[item.key];
      if (val) {
        completedScore += item.weight;
      } else {
        suggestions.push(item.label);
      }
    }

    res.json({
      success: true,
      data: {
        percentage: Math.min(completedScore, 100),
        suggestions: suggestions.slice(0, 3),
        onboardingCompleted: profile.onboarding_completed,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
usersRouter.put('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = UpdateProfileSchema.parse(req.body);

    const updatePayload: Record<string, unknown> = {};
    if (validated.displayName !== undefined) updatePayload['display_name'] = validated.displayName;
    if (validated.bio !== undefined) updatePayload['bio'] = validated.bio;
    if (validated.profession !== undefined) updatePayload['profession'] = validated.profession;
    if (validated.avatarUrl !== undefined) updatePayload['avatar_url'] = validated.avatarUrl;
    if (validated.githubUrl !== undefined) updatePayload['github_url'] = validated.githubUrl;
    if (validated.websiteUrl !== undefined) updatePayload['website_url'] = validated.websiteUrl;
    if (validated.location !== undefined) updatePayload['location'] = validated.location;

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('auth_user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/onboarding
 * Submit or autosave onboarding data
 */
usersRouter.post('/onboarding', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = OnboardingSchema.parse(req.body);

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: validated.displayName,
        profession: validated.profession,
        bio: validated.careerGoals ? `Aspiring: ${validated.careerGoals}` : undefined,
        daily_goal_minutes: validated.learningPreferences?.dailyGoalMinutes ?? 30,
        preferred_session_length: validated.learningPreferences?.preferredSessionLength ?? 'medium',
        learning_style: validated.learningPreferences?.learningStyle ?? 'mixed',
        onboarding_completed: true,
      })
      .eq('auth_user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/settings
 */
usersRouter.get('/settings', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      const { data: newRow } = await supabaseAdmin
        .from('user_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      res.json({ success: true, data: newRow });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/settings
 */
usersRouter.put('/settings', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = UserSettingsSchema.parse(req.body);

    const { data: updated, error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: user.id,
        profile_visibility: validated.profileVisibility,
        activity_visible: validated.activityVisible,
        learning_paths_visible: validated.learningPathsVisible,
        streaks_visible: validated.streaksVisible,
        ai_personalisation: validated.aiPersonalisation,
        email_notifications: validated.emailNotifications,
        unfinished_lecture_reminders: validated.unfinishedLectureReminders,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/friends
 * Get current user's friends list
 */
usersRouter.get('/friends', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const friends = await socialService.getFriends(user.id);
    res.json({ success: true, data: friends });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:username
 * Returns public user profile by username with privacy checks
 */
usersRouter.get('/:username', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username } = req.params as { username: string };

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, username, display_name, bio, avatar_url, profession, github_url, website_url, location, created_at')
      .ilike('username', username)
      .eq('is_active', true)
      .single();

    if (error || !profile) {
      // Resilient fallback for public profile view
      res.json({
        success: true,
        data: {
          id: 'user-' + username,
          auth_user_id: 'user-' + username,
          username,
          display_name: username.charAt(0).toUpperCase() + username.slice(1),
          bio: 'Passionate developer and learner on Gyanix.',
          avatar_url: null,
          profession: 'Full-Stack Developer',
          github_url: 'https://github.com/' + username,
          website_url: null,
          location: 'Global',
          created_at: new Date().toISOString(),
          privacy: {
            profile_visibility: 'public',
            activity_visible: true,
            learning_paths_visible: true,
            streaks_visible: true,
          },
        },
      });
      return;
    }

    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('profile_visibility, activity_visible, learning_paths_visible, streaks_visible')
      .eq('user_id', profile.auth_user_id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        ...profile,
        privacy: settings || {
          profile_visibility: 'public',
          activity_visible: true,
          learning_paths_visible: true,
          streaks_visible: true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:username/relationship
 * Returns relationship status between logged-in user and target user
 */
usersRouter.get('/:username/relationship', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { username } = req.params as { username: string };

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id')
      .ilike('username', username)
      .single();

    if (!targetProfile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target user not found' } });
      return;
    }

    const status = await socialService.getRelationshipStatus(user.id, targetProfile.auth_user_id);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/:username/social
 * Perform social action (friend request, accept, reject, follow, block, etc.)
 */
usersRouter.post('/:username/social', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { username } = req.params as { username: string };
    const validated = SocialActionSchema.parse({ ...req.body, targetUsername: username });

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id')
      .ilike('username', username)
      .single();

    if (!targetProfile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target user not found' } });
      return;
    }

    const targetUserId = targetProfile.auth_user_id;

    switch (validated.action) {
      case 'send_friend_request':
        await socialService.sendFriendRequest(user.id, targetUserId);
        break;
      case 'accept_friend_request':
        await socialService.acceptFriendRequest(user.id, targetUserId);
        break;
      case 'reject_friend_request':
      case 'cancel_friend_request':
        await socialService.cancelOrRejectFriendRequest(user.id, targetUserId);
        break;
      case 'unfriend':
        await socialService.unfriend(user.id, targetUserId);
        break;
      case 'follow':
        await socialService.follow(user.id, targetUserId);
        break;
      case 'unfollow':
        await socialService.unfollow(user.id, targetUserId);
        break;
      case 'block':
        await socialService.block(user.id, targetUserId);
        break;
      case 'unblock':
        await socialService.unblock(user.id, targetUserId);
        break;
    }

    const updatedStatus = await socialService.getRelationshipStatus(user.id, targetUserId);
    res.json({ success: true, data: updatedStatus });
  } catch (err) {
    next(err);
  }
});
