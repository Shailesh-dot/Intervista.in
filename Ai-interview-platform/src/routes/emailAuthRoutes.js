import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendVerification, verifyEmail } from '../services/verificationService.js';

const router = express.Router();

// Rate limiter: max 20 requests per 15 minutes per IP for all auth endpoints
const emailAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

router.use(emailAuthLimiter);

// ─── GET /api/auth/verify-email?token=... ─────────────────────────────────────
// User clicks link in email → this verifies them and shows success HTML page
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (typeof token !== 'string' || !token) {
    return res.status(400).send(errorPage('Invalid Link', 'The verification link is invalid or missing.'));
  }

  try {
    await verifyEmail(token);
    return res.status(200).send(successPage());
  } catch (err) {
    console.error('Email verification error:', err.message);
    return res.status(400).send(errorPage('Link Expired', 'This verification link is invalid or has expired. Please request a new one.'));
  }
});

// ─── POST /api/auth/resend-verification ──────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  const email    = req.body.email?.trim();
  const userType = req.body.userType;
  const firstName = req.body.firstName || '';

  if (!email || !['candidate', 'hr'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    await sendVerification({ userType, email, firstName });
    return res.json({ success: true, message: 'Verification email sent.' });
  } catch (err) {
    if (err.message === 'VERIFICATION_RESEND_COOLDOWN') {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting another verification email.' });
    }
    if (err.message === 'EMAIL_ALREADY_VERIFIED') {
      return res.status(400).json({ error: 'Email is already verified.' });
    }
    // For security: don't reveal if the account exists
    return res.json({ success: true, message: 'If the account exists and is unverified, a verification email has been sent.' });
  }
});

// ─── HTML success page ────────────────────────────────────────────────────────
function successPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verified - Intervista</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#EAF0F0; font-family:Arial,Helvetica,sans-serif; }
    .card { max-width:460px; margin:20px; padding:40px; text-align:center; background:#fff; border-radius:24px; box-shadow:0 4px 20px rgba(20,69,66,0.06); }
    .icon { width:64px; height:64px; margin:0 auto 24px; border-radius:50%; background:#DAFF0C; color:#144542; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:900; }
    h1 { color:#144542; font-size:28px; font-weight:900; margin:0 0 16px; }
    p  { color:#6F7777; font-size:15px; line-height:1.6; margin:0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Email Verified!</h1>
    <p>Your email has been successfully verified. You can safely close this window and return to the Intervista app.</p>
  </div>
  <script>setTimeout(() => { window.close(); }, 4000);</script>
</body>
</html>`;
}

// ─── HTML error page ──────────────────────────────────────────────────────────
function errorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Intervista</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#EAF0F0; font-family:Arial,Helvetica,sans-serif; }
    .card { max-width:460px; margin:20px; padding:40px; text-align:center; background:#fff; border-radius:24px; box-shadow:0 4px 20px rgba(20,69,66,0.06); }
    .icon { width:64px; height:64px; margin:0 auto 24px; border-radius:50%; background:#ffeeee; color:#cc4444; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:900; }
    h1 { color:#144542; font-size:24px; font-weight:900; margin:0 0 16px; }
    p  { color:#6F7777; font-size:15px; line-height:1.6; margin:0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✗</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export default router;
