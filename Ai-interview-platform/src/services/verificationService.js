import { findUserByEmail, findUserById, markEmailVerified, getConfig } from '../repositories/userRepository.js';
import { createEmailToken, consumeEmailToken, canResendVerification } from './emailTokenService.js';
import { sendCandidateVerificationEmail, sendHrVerificationEmail } from './emailService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Send verification email ──────────────────────────────────────────────────
export async function sendVerification({ userType = 'candidate', email, firstName = '' }) {
  const normalizedEmail = email.trim().toLowerCase();

  // If user already exists, check if already verified
  let userId = 'pre_registration';
  try {
    const user = await findUserByEmail({ userType, email: normalizedEmail });
    if (user) {
      const cfg = getConfig(userType);
      userId = user[cfg.idColumn];
      const verified = user[cfg.verifiedColumn];
      if (verified) throw new Error('EMAIL_ALREADY_VERIFIED');
    }
  } catch (err) {
    if (err.message === 'EMAIL_ALREADY_VERIFIED') throw err;
    // Otherwise continue — pre-registration verification
  }

  const allowed = await canResendVerification({ email: normalizedEmail });
  if (!allowed) throw new Error('VERIFICATION_RESEND_COOLDOWN');

  const { rawToken } = await createEmailToken({
    userType,
    userId,
    email: normalizedEmail,
    purpose: 'verification'
  });

  // Verification link points to /api/verify which renders the branded confirmation page
  const verificationUrl =
    `${FRONTEND_URL}/api/verify?token=${encodeURIComponent(rawToken)}`;

  if (userType === 'candidate') {
    await sendCandidateVerificationEmail({ email: normalizedEmail, firstName, verificationUrl });
  } else {
    await sendHrVerificationEmail({ email: normalizedEmail, firstName, verificationUrl });
  }
}

// ─── Verify email from token in link ─────────────────────────────────────────
export async function verifyEmail(rawToken) {
  const token = await consumeEmailToken({ rawToken, purpose: 'verification' });
  if (!token) throw new Error('INVALID_OR_EXPIRED_TOKEN');

  // If this token was associated with an existing registered user in DB, mark verified
  if (token.user_id && token.user_id !== 'pre_registration') {
    try {
      await markEmailVerified({ userType: token.user_type, userId: token.user_id });
    } catch (err) {
      console.warn('Could not mark email verified on user record:', err.message);
    }
  }

  return { userType: token.user_type, userId: token.user_id, email: token.email };
}
