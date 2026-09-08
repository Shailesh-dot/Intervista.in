// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#144542',
  accent: '#DAFF0C',
  background: '#EAF0F0',
  text: '#144542',
  muted: '#6F7777'
};

// Prevents XSS in any user-supplied values embedded in HTML emails
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Shared outer wrapper ─────────────────────────────────────────────────────
function baseTemplate(content) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://intervista.in';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Intervista</title>
</head>
<body style="margin:0;padding:40px 20px;background:${BRAND.background};font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;padding:40px;box-sizing:border-box;box-shadow:0 4px 20px rgba(20,69,66,0.06);">
    <div style="margin-bottom:28px;">
      <span style="display:inline-block;background:${BRAND.primary};color:${BRAND.accent};font-size:20px;font-weight:900;padding:10px 18px;border-radius:12px;letter-spacing:-0.5px;">
        Intervista
      </span>
    </div>
    ${content}
    <div style="margin-top:35px;padding-top:20px;border-top:1px solid #E6EEEE;color:${BRAND.muted};font-size:12px;line-height:1.6;">
      This is an automated message from Intervista. Please do not reply if you do not recognise this activity.<br><br>
      Intervista — <a href="${frontendUrl}" style="color:${BRAND.primary};">${frontendUrl}</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Candidate email verification ─────────────────────────────────────────────
export function candidateVerificationEmail({ firstName, verificationUrl }) {
  const safeName = escapeHtml(firstName || 'there');
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:${BRAND.primary};border-radius:16px;display:inline-block;line-height:56px;font-size:28px;color:${BRAND.accent};">❊</div>
    </div>
    <h1 style="color:${BRAND.text};font-size:26px;font-weight:900;margin:0 0 16px;letter-spacing:-0.5px;text-align:center;">Verify your email</h1>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.7;margin:0 0 8px;">Hi ${safeName},</p>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.7;margin:0 0 28px;">
      Welcome to Intervista! Please verify your email address to unlock your personal workspace and start your journey.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${verificationUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:15px 32px;border-radius:12px;font-weight:900;font-size:15px;box-shadow:0 4px 14px rgba(20,69,66,0.2);">
        Verify Email Address
      </a>
    </div>
    <p style="color:${BRAND.muted};font-size:13px;line-height:1.6;margin:0;text-align:center;">
      This link expires in <strong>24 hours</strong>. If you did not create an Intervista account, you can safely ignore this email.
    </p>
  `);
}

// ─── HR / Company email verification ─────────────────────────────────────────
export function hrVerificationEmail({ firstName, verificationUrl }) {
  const safeName = escapeHtml(firstName || 'there');
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:${BRAND.primary};border-radius:16px;display:inline-block;line-height:56px;font-size:28px;">🏢</div>
    </div>
    <h1 style="color:${BRAND.text};font-size:26px;font-weight:900;margin:0 0 16px;letter-spacing:-0.5px;text-align:center;">Verify your company email</h1>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.7;margin:0 0 8px;">Hi ${safeName},</p>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.7;margin:0 0 28px;">
      You're almost ready to start hiring! Please verify your company email to unlock your recruitment workspace.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${verificationUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:15px 32px;border-radius:12px;font-weight:900;font-size:15px;box-shadow:0 4px 14px rgba(20,69,66,0.2);">
        Verify Company Email
      </a>
    </div>
    <p style="color:${BRAND.muted};font-size:13px;line-height:1.6;margin:0;text-align:center;">
      This link expires in <strong>24 hours</strong>. If you did not create an Intervista account, you can safely ignore this email.
    </p>
  `);
}

// ─── Password reset ──────────────────────────────────────────────────────────
export function passwordResetEmail({ firstName, resetUrl }) {
  const safeName = escapeHtml(firstName || 'there');
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:${BRAND.primary};border-radius:16px;display:inline-block;line-height:56px;font-size:28px;">🔑</div>
    </div>
    <h1 style="color:${BRAND.text};font-size:26px;font-weight:900;margin:0 0 16px;letter-spacing:-0.5px;text-align:center;">Reset your password</h1>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.7;margin:0 0 8px;">Hi ${safeName},</p>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.7;margin:0 0 28px;">
      We received a request to reset your Intervista account password. Click the button below to create a new password.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:15px 32px;border-radius:12px;font-weight:900;font-size:15px;box-shadow:0 4px 14px rgba(20,69,66,0.2);">
        Reset Password
      </a>
    </div>
    <p style="color:${BRAND.muted};font-size:13px;line-height:1.6;margin:0;text-align:center;">
      This link expires in <strong>20 minutes</strong> and can only be used once.<br>
      If you did not request a password reset, you can safely ignore this email.
    </p>
  `);
}

// ─── Contact form — internal notification to Intervista team ─────────────────
export function contactFormNotification({
  firstName, lastName, email, company,
  employees, industry, country, phone,
  jobTitle, description, newsletter
}) {
  const rows = [
    ['Name',       `${escapeHtml(firstName)} ${escapeHtml(lastName || '')}`],
    ['Email',      escapeHtml(email)],
    ['Company',    escapeHtml(company    || '—')],
    ['Employees',  escapeHtml(employees  || '—')],
    ['Industry',   escapeHtml(industry   || '—')],
    ['Country',    escapeHtml(country    || '—')],
    ['Phone',      escapeHtml(phone      || '—')],
    ['Job Title',  escapeHtml(jobTitle   || '—')],
    ['Newsletter', newsletter ? 'Yes' : 'No']
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 0;color:${BRAND.muted};font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:0.1em;width:140px;vertical-align:top;border-bottom:1px solid #EAF0F0;">${label}</td>
      <td style="padding:10px 0;color:${BRAND.text};font-weight:600;border-bottom:1px solid #EAF0F0;">${value}</td>
    </tr>
  `).join('');

  const descBlock = description ? `
    <div style="margin-top:24px;padding:20px;background:#f8fafa;border-radius:12px;border-left:4px solid ${BRAND.accent};">
      <p style="color:${BRAND.muted};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Message</p>
      <p style="color:${BRAND.text};font-size:14px;line-height:1.7;margin:0;">${escapeHtml(description)}</p>
    </div>
  ` : '';

  return baseTemplate(`
    <h1 style="color:${BRAND.text};font-size:22px;font-weight:900;margin:0 0 8px;">New Contact Form Submission</h1>
    <p style="color:${BRAND.muted};font-size:14px;margin:0 0 24px;">Received from the Intervista contact page.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${tableRows}</table>
    ${descBlock}
  `);
}

// ─── Contact form — auto-reply to sender ─────────────────────────────────────
export function contactFormAutoReply({ firstName }) {
  const safeName = escapeHtml(firstName || 'there');
  return baseTemplate(`
    <h1 style="color:${BRAND.text};font-size:24px;font-weight:900;margin:0 0 16px;">Thanks for reaching out, ${safeName}!</h1>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.7;margin:0 0 28px;">
      We've received your message and our team will get back to you within <strong style="color:${BRAND.text};">1–2 business days</strong>.
    </p>
    <p style="color:${BRAND.muted};font-size:13px;margin:0;">
      For urgent queries, reach us at <a href="mailto:team@intervista.in" style="color:${BRAND.primary};font-weight:700;">team@intervista.in</a>
    </p>
  `);
}
