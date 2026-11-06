import { supabaseAdmin } from '../config/supabase.js';

export const privacyFilter = {
  /**
   * Cleans text to strip email addresses, JWTs, and potential credential patterns
   */
  sanitizeText(text: string): string {
    return text
      // Replace JWT / token patterns
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_TOKEN]')
      // Replace API key patterns
      .replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, '[REDACTED_KEY]')
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]')
      // Replace emails
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]')
      // Replace phone numbers (with word boundaries)
      .replace(/\b(?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g, '[REDACTED_PHONE]');
  },

  /**
   * Checks whether the user has opted out of AI personalisation
   */
  async canUsePersonalizedData(userId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('user_settings')
      .select('ai_personalisation')
      .eq('user_id', userId)
      .maybeSingle();

    return data?.ai_personalisation ?? true;
  },
};
