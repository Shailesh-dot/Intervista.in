import { BrevoClient } from '@getbrevo/brevo';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BREVO_API_KEY) {
  throw new Error('BREVO_API_KEY is missing from .env');
}
if (!process.env.BREVO_SENDER_EMAIL) {
  throw new Error('BREVO_SENDER_EMAIL is missing from .env');
}

// Create Brevo client with API key
export const brevoClient = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
});

export const sender = {
  name: process.env.BREVO_SENDER_NAME || 'Intervista',
  email: process.env.BREVO_SENDER_EMAIL
};

export const replyTo = {
  email: process.env.BREVO_REPLY_TO || process.env.BREVO_SENDER_EMAIL
};
