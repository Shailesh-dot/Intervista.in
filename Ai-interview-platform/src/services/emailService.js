import { brevoClient, sender, replyTo } from '../config/brevo.js';

// ─── Core send function ───────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, tags = [] }) {
  if (!to) throw new Error('Recipient email is required');

  const payload = {
    sender,
    replyTo,
    to: [{ email: to }],
    subject,
    htmlContent: html
  };

  if (tags.length > 0) payload.tags = tags;

  return brevoClient.transactionalEmails.sendTransacEmail(payload);
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function sendCandidateVerificationEmail({ email, firstName, verificationUrl }) {
  const { candidateVerificationEmail } = await import('../email/templates.js');
  const html = candidateVerificationEmail({ firstName, verificationUrl });
  return sendEmail({
    to: email,
    subject: 'Verify your Intervista account',
    html,
    tags: ['candidate-verification']
  });
}

export async function sendHrVerificationEmail({ email, firstName, verificationUrl }) {
  const { hrVerificationEmail } = await import('../email/templates.js');
  const html = hrVerificationEmail({ firstName, verificationUrl });
  return sendEmail({
    to: email,
    subject: 'Verify your Intervista company account',
    html,
    tags: ['hr-verification']
  });
}

export async function sendPasswordResetEmail({ email, firstName, resetUrl }) {
  const { passwordResetEmail } = await import('../email/templates.js');
  const html = passwordResetEmail({ firstName, resetUrl });
  return sendEmail({
    to: email,
    subject: 'Reset your Intervista password',
    html,
    tags: ['password-reset']
  });
}

export async function sendContactNotification({ to, data }) {
  const { contactFormNotification } = await import('../email/templates.js');
  const html = contactFormNotification(data);
  return sendEmail({
    to,
    subject: `New Contact Form — ${data.firstName} ${data.lastName || ''} (${data.company || 'N/A'})`,
    html,
    tags: ['contact-form']
  });
}

export async function sendContactAutoReply({ email, firstName }) {
  const { contactFormAutoReply } = await import('../email/templates.js');
  const html = contactFormAutoReply({ firstName });
  return sendEmail({
    to: email,
    subject: 'We received your message — Intervista',
    html,
    tags: ['contact-autoreply']
  });
}
