import crypto from 'crypto';

const TOKEN_BYTES = Number(process.env.EMAIL_TOKEN_BYTES || 32);

/**
 * Generates a cryptographically secure random token.
 * Returns a URL-safe hex string (64 chars for 32 bytes).
 */
export function generateEmailToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Hashes a raw token with SHA-256.
 * Only the hash is stored in the database — not the raw token.
 * This means a database breach cannot be used to replay verification links.
 */
export function hashEmailToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}
