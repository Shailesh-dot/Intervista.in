import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './src/config/supabase.js';
import {
  sendPasswordResetEmail,
  sendContactNotification,
  sendContactAutoReply
} from './src/services/emailService.js';
import emailAuthRoutes from './src/routes/emailAuthRoutes.js';
import { sendVerification, verifyEmail } from './src/services/verificationService.js';

dotenv.config();

const app  = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ─── Email auth routes (verify-email, resend-verification) ────────────────────
app.use('/api/auth', emailAuthRoutes);

// ─── Direct /api/verify route (handles links clicked from email) ──────────────
app.get('/api/verify', async (req, res) => {
  const { token } = req.query;

  if (typeof token !== 'string' || !token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title style="margin-left:50px;">Invalid Link - Intervista</title>
        <style>
          body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#EAF0F0; font-family:Arial,Helvetica,sans-serif; }
          .card { max-width:440px; margin:20px; padding:40px; text-align:center; background:#fff; border-radius:24px; box-shadow:0 4px 20px rgba(20,69,66,0.06); }
          .icon { width:64px; height:64px; margin:0 auto 20px; border-radius:50%; background:#fee; color:#c33; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:bold; }
          h1 { color:#144542; font-size:24px; font-weight:900; margin:0 0 12px; }
          p { color:#6F7777; font-size:14px; line-height:1.6; margin:0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✕</div>
          <h1>Invalid Link</h1>
          <p>The verification link is invalid or missing.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    await verifyEmail(token);
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - Intervista</title>
        <style>
          body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#EAF0F0; font-family:Arial,Helvetica,sans-serif; }
          .card { max-width:440px; margin:20px; padding:40px; text-align:center; background:#fff; border-radius:24px; box-shadow:0 4px 20px rgba(20,69,66,0.06); }
          .icon { width:64px; height:64px; margin:0 auto 24px; border-radius:50%; background:#DAFF0C; color:#144542; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:900; }
          h1 { color:#144542; font-size:28px; font-weight:900; margin:0 0 16px; letter-spacing:-0.5px; }
          p { color:#6F7777; font-size:15px; line-height:1.6; margin:0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Email Verified!</h1>
          <p>Your email has been successfully verified. You can safely close this window and return to the Intervista app to continue.</p>
        </div>
        <script>
          setTimeout(() => { try { window.close(); } catch(e) {} }, 4000);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Email verification error:', err.message);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Link Expired - Intervista</title>
        <style>
          body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#EAF0F0; font-family:Arial,Helvetica,sans-serif; }
          .card { max-width:440px; margin:20px; padding:40px; text-align:center; background:#fff; border-radius:24px; box-shadow:0 4px 20px rgba(20,69,66,0.06); }
          .icon { width:64px; height:64px; margin:0 auto 20px; border-radius:50%; background:#fee; color:#c33; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:bold; }
          h1 { color:#144542; font-size:24px; font-weight:900; margin:0 0 12px; }
          p { color:#6F7777; font-size:14px; line-height:1.6; margin:0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✕</div>
          <h1>Invalid or Expired Link</h1>
          <p>This verification link is invalid or has already been used. Please request a new verification email.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// ─── Check email verification status (polled by React after clicking Verify) ──
// Checks if the LATEST verification token for this email was consumed
app.get('/api/check-verification/:email', async (req, res) => {
  const email = req.params.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // 1. Fetch the MOST RECENT verification token generated for this email
    const { data: latestToken, error: tokenErr } = await supabase
      .from('auth_email_tokens')
      .select('id, consumed_at, expires_at, created_at')
      .eq('email', email)
      .eq('purpose', 'verification')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenErr) {
      console.error('Error fetching latest token:', tokenErr.message);
    }

    // If the latest token exists and has been consumed (clicked by user in Gmail), return true
    if (latestToken && latestToken.consumed_at) {
      return res.json({ verified: true });
    }

    // Otherwise, it has NOT been verified yet
    return res.json({ verified: false });
  } catch (err) {
    console.error('check-verification error:', err);
    return res.json({ verified: false });
  }
});

// ─── Send verification email (called from React UserRegister & CompanyRegister) ──
app.post('/api/send-verification', async (req, res) => {
  const { email, type, firstName, userType } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // If type is reset, tell the client to use /api/send-reset
  if (type === 'reset') {
    return res.status(400).json({ error: 'Use /api/send-reset for password reset emails' });
  }

  try {
    const resolvedUserType = userType || 'candidate';
    await sendVerification({
      userType: resolvedUserType,
      email: email.trim().toLowerCase(),
      firstName: firstName || ''
    });
    return res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    if (err.message === 'EMAIL_ALREADY_VERIFIED') {
      return res.status(400).json({ error: 'Email is already verified.' });
    }
    if (err.message === 'VERIFICATION_RESEND_COOLDOWN') {
      return res.status(429).json({ error: 'Please wait before requesting another verification email.' });
    }
    console.error('send-verification error:', err);
    return res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// ─── Secure Password Reset Email (called by .NET UserApi backend) ─────────────
// The token was already generated and hashed by .NET — we only send the email via Brevo.
app.post('/api/send-reset', async (req, res) => {
  const { email, resetLink } = req.body;
  if (!email || !resetLink) {
    return res.status(400).json({ error: 'email and resetLink are required' });
  }

  try {
    await sendPasswordResetEmail({
      email: email.trim().toLowerCase(),
      firstName: '',
      resetUrl: resetLink
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/send-reset:', err);
    return res.status(500).json({ error: err.message || 'Failed to send reset email' });
  }
});

// ─── Contact Form ─────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const {
    firstName, lastName, email, company,
    employees, industry, country, phone,
    jobTitle, description, newsletter
  } = req.body;

  if (!firstName || !email) {
    return res.status(400).json({ error: 'First name and email are required.' });
  }

  try {
    // 1. Notify the Intervista team
    await sendContactNotification({
      to: 'team@intervista.in',
      data: { firstName, lastName, email, company, employees, industry, country, phone, jobTitle, description, newsletter }
    });

    // 2. Auto-reply to the sender
    await sendContactAutoReply({ email, firstName });

    return res.json({ success: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`[server.js] Email & Auth server running on http://localhost:${PORT}`);
});
