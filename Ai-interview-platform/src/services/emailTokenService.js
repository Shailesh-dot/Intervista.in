import { supabase } from '../config/supabase.js';
import { generateEmailToken, hashEmailToken } from '../utils/emailTokens.js';

const VERIFICATION_HOURS = Number(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || 24);
const RESET_MINUTES      = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES   || 20);
const RESEND_COOLDOWN    = Number(process.env.EMAIL_RESEND_COOLDOWN_SECONDS    || 60);

function expiryFromNow(ms) {
  return new Date(Date.now() + ms).toISOString();
}

// ─── Create a new token ───────────────────────────────────────────────────────
export async function createEmailToken({ userType = 'candidate', userId = 'pre_registration', email, purpose }) {
  const rawToken  = generateEmailToken();
  const tokenHash = hashEmailToken(rawToken);

  const expiresAt = purpose === 'verification'
    ? expiryFromNow(VERIFICATION_HOURS * 60 * 60 * 1000)
    : expiryFromNow(RESET_MINUTES * 60 * 1000);

  const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN * 1000).toISOString();

  // DELETE any existing unconsumed tokens for this email+purpose.
  // Using DELETE (not UPDATE consumed_at) so that consumed_at ONLY ever means
  // "user actually clicked the link in their email". If we just set consumed_at
  // here, there is a race-condition window between this UPDATE and the INSERT
  // below where the polling check would see consumed_at on the latest token
  // and wrongly return { verified: true } before the user clicks anything.
  const { error: invalidateError } = await supabase
    .from('auth_email_tokens')
    .delete()
    .eq('email',   email.toLowerCase())
    .eq('purpose', purpose)
    .is('consumed_at', null);

  if (invalidateError) {
    console.warn('Could not invalidate previous tokens:', invalidateError.message);
  }

  // Insert the new token (store hash, not raw)
  const { error } = await supabase
    .from('auth_email_tokens')
    .insert({
      user_type:          userType,
      user_id:            String(userId || 'pre_registration'),
      email:              email.toLowerCase(),
      purpose,
      token_hash:         tokenHash,
      expires_at:         expiresAt,
      resend_available_at: resendAvailableAt
    });

  if (error) throw error;

  return { rawToken, expiresAt };
}

// ─── Consume a token (atomic via Supabase RPC) ────────────────────────────────
export async function consumeEmailToken({ rawToken, purpose }) {
  const tokenHash = hashEmailToken(rawToken);

  // Use the atomic PostgreSQL function to prevent double-consume race conditions
  const { data, error } = await supabase.rpc('consume_email_token', {
    p_token_hash: tokenHash,
    p_purpose:    purpose
  });

  if (error) throw error;

  // RPC returns an array; null/empty means invalid/expired/already used
  return data?.[0] || null;
}

// ─── Check resend cooldown ────────────────────────────────────────────────────
export async function canResendVerification({ email }) {
  if (!email) return true;

  const { data, error } = await supabase
    .from('auth_email_tokens')
    .select('resend_available_at')
    .eq('email',   email.toLowerCase())
    .eq('purpose', 'verification')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.resend_available_at) return true;

  return new Date(data.resend_available_at).getTime() <= Date.now();
}
