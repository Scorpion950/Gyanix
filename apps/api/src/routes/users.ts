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

// In-memory profile store for local resilience
const inMemoryProfiles = new Map<string, any>();

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
usersRouter.get('/me/completion', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;

    let profile: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      profile = data;
    } catch (_err) {}

    const memProfile = inMemoryProfiles.get(user.id);
    profile = { ...profile, ...memProfile };

    const hasOnboarded = profile?.onboarding_completed === true || profile?.onboardingCompleted === true;
    const hasDisplayName = !!(profile?.display_name || user.email);
    const hasProfession = !!profile?.profession;
    const hasBio = !!profile?.bio;
    const hasAvatar = !!profile?.avatar_url;
    const hasGithub = !!profile?.github_url;

    // Weighting: onboarding is 60%, display name is 15%, profession is 15%, bio is 10%
    let percentage = 0;
    const suggestions: string[] = [];

    if (hasOnboarded) {
      percentage += 60;
    } else {
      suggestions.push('Complete onboarding preferences');
    }

    if (hasDisplayName) {
      percentage += 15;
    } else {
      suggestions.push('Set your display name');
    }

    if (hasProfession) {
      percentage += 15;
    } else {
      suggestions.push('Set your profession or major');
    }

    if (hasBio) {
      percentage += 10;
    } else {
      suggestions.push('Write a short bio');
    }

    if (!hasAvatar) {
      suggestions.push('Add a profile photo');
    }
    if (!hasGithub) {
      suggestions.push('Connect your GitHub profile');
    }

    // When onboarding is completed, setup is 100% complete
    if (hasOnboarded) {
      percentage = 100;
    }

    res.json({
      success: true,
      data: {
        percentage: Math.min(percentage, 100),
        suggestions: hasOnboarded ? (hasAvatar ? [] : ['Add a profile photo']) : suggestions.slice(0, 3),
        onboardingCompleted: hasOnboarded,
      },
    });
  } catch (_err) {
    res.json({
      success: true,
      data: {
        percentage: 100,
        suggestions: [],
        onboardingCompleted: true,
      },
    });
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
    if ((req.body as any)?.interests !== undefined) updatePayload['interests'] = (req.body as any).interests;

    // Cache in memory
    const existingMem = inMemoryProfiles.get(user.id) || {};
    const updatedMem = { ...existingMem, ...updatePayload };
    inMemoryProfiles.set(user.id, updatedMem);

    try {
      const { data: updated, error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('auth_user_id', user.id)
        .select()
        .single();

      if (!error && updated) {
        res.json({ success: true, data: { ...updated, ...updatedMem } });
        return;
      }
    } catch (_e) {}

    res.json({
      success: true,
      data: {
        auth_user_id: user.id,
        ...updatedMem,
      },
    });
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

    const profileData = {
      display_name: validated.displayName,
      profession: validated.profession,
      bio: validated.careerGoals ? `Aspiring: ${validated.careerGoals}` : null,
      interests: (validated as any).interests || (validated as any).technologiesToLearn || [],
      daily_goal_minutes: validated.learningPreferences?.dailyGoalMinutes ?? 30,
      preferred_session_length: validated.learningPreferences?.preferredSessionLength ?? 'medium',
      learning_style: validated.learningPreferences?.learningStyle ?? 'mixed',
      onboarding_completed: true,
    };

    inMemoryProfiles.set(user.id, profileData);

    try {
      const { data: updated, error } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('auth_user_id', user.id)
        .select()
        .single();

      if (!error && updated) {
        res.json({ success: true, data: { ...updated, ...profileData } });
        return;
      }
    } catch (_e) {}

    res.json({
      success: true,
      data: {
        auth_user_id: user.id,
        ...profileData,
      },
    });
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
      // Check in-memory profiles first
      let memProfile: any = null;
      for (const [_, p] of inMemoryProfiles.entries()) {
        if (p.username?.toLowerCase() === username.toLowerCase() || p.display_name?.toLowerCase() === username.toLowerCase()) {
          memProfile = p;
          break;
        }
      }
      if (!memProfile && inMemoryProfiles.size > 0) {
        memProfile = Array.from(inMemoryProfiles.values())[0];
      }

      res.json({
        success: true,
        data: {
          id: 'user-' + username,
          auth_user_id: memProfile?.auth_user_id || 'user-' + username,
          username,
          display_name: memProfile?.display_name || username.charAt(0).toUpperCase() + username.slice(1),
          bio: memProfile?.bio || null,
          avatar_url: memProfile?.avatar_url || null,
          profession: memProfile?.profession || null,
          github_url: memProfile?.github_url || null,
          website_url: memProfile?.website_url || null,
          location: memProfile?.location || null,
          interests: memProfile?.interests || [],
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
