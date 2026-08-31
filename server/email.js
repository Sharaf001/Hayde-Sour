// Sends transactional email via Brevo's HTTP API (no SMTP needed).
// Docs: https://developers.brevo.com/reference/sendtransacemail

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('Missing BREVO_API_KEY');
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Where To Go Sour';
  if (!senderEmail) {
    throw new Error('Missing BREVO_SENDER_EMAIL - this must be an email/domain verified as a sender in your Brevo account');
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
}

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function verificationEmailHtml(code) {
  return `
    <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
      <h2 style="color:#183c44;">Confirm your email</h2>
      <p>Your verification code for Where To Go Sour is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color:#183c44;">${code}</p>
      <p style="color:#666; font-size: 13px;">This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

export function resetPasswordEmailHtml(code) {
  return `
    <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
      <h2 style="color:#183c44;">Reset your password</h2>
      <p>Your password reset code for Where To Go Sour is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color:#183c44;">${code}</p>
      <p style="color:#666; font-size: 13px;">This code expires in 15 minutes. If you didn't request this, you can ignore this email - your password will not change.</p>
    </div>
  `;
}
