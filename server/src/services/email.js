import config from '../config/env.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 8000;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character];
  });
}

async function sendEmail({ to, subject, text, html, replyTo = config.emailReplyTo }) {
  if (config.demo || !config.resendApiKey || !to) return false;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: [to],
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        JSON.stringify({ level: 'error', event: 'transactional_email_failed', status: response.status }),
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'transactional_email_failed',
        reason: error.name === 'TimeoutError' ? 'timeout' : 'network_error',
      }),
    );
    return false;
  }
}

export async function sendWelcomeEmail(user) {
  if (!user?.email) return false;
  const username = String(user.username || 'there');
  const safeUsername = escapeHtml(username);
  const signInUrl = 'https://erasepaper.online/sign-in';
  return sendEmail({
    to: user.email,
    subject: 'Welcome to ErasePaper',
    text: `Hi ${username},\n\nYour ErasePaper account is ready. Sign in at ${signInUrl} to submit and track academic-support requests.\n\nThis is a welcome message, not an email-verification message.\n\nErasePaper Support`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b4d"><h1 style="color:#6554d9">Welcome to ErasePaper</h1><p>Hi ${safeUsername},</p><p>Your account is ready. Sign in to submit and track your academic-support requests.</p><p><a href="${signInUrl}" style="display:inline-block;background:#6554d9;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Sign in to ErasePaper</a></p><p style="font-size:13px;color:#64748b">This is a welcome message, not an email-verification message. Email addresses are not verified.</p><p>ErasePaper Support</p></div>`,
  });
}

export async function sendRequestEmails({ user, requestId, serviceName }) {
  if (!user?.email || !requestId || !serviceName) return;

  const safeRequestId = String(requestId);
  const safeServiceName = String(serviceName);
  const safeUsername = String(user.username || 'student');
  const safeUserEmail = String(user.email);
  const safeRequestIdHtml = escapeHtml(safeRequestId);
  const safeServiceNameHtml = escapeHtml(safeServiceName);
  const safeUsernameHtml = escapeHtml(safeUsername);
  const safeUserEmailHtml = escapeHtml(safeUserEmail);
  const requestsUrl = 'https://erasepaper.online/requests';
  const adminUrl = 'https://erasepaper.online/admin/requests';

  await Promise.all([
    sendEmail({
      to: user.email,
      subject: `We received your ErasePaper request ${safeRequestId}`,
      text: `Hi ${safeUsername},\n\nWe received your ${safeServiceName} request. Your request ID is ${safeRequestId}. You can sign in to ErasePaper to view its status: ${requestsUrl}\n\nFor help, reply to this email.\n\nErasePaper Support`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b4d"><h1 style="color:#6554d9">Request received</h1><p>Hi ${safeUsernameHtml},</p><p>We received your <strong>${safeServiceNameHtml}</strong> request.</p><p>Request ID: <strong>${safeRequestIdHtml}</strong></p><p><a href="${requestsUrl}" style="display:inline-block;background:#6554d9;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">View my requests</a></p><p>For help, reply to this email.</p><p>ErasePaper Support</p></div>`,
    }),
    sendEmail({
      to: config.supportEmail,
      replyTo: user.email,
      subject: `New ErasePaper service request ${safeRequestId}`,
      text: `A new service request was submitted.\n\nRequest ID: ${safeRequestId}\nService: ${safeServiceName}\nStudent: ${safeUsername}\nStudent email: ${safeUserEmail}\n\nReview it in the ErasePaper admin panel: ${adminUrl}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b4d"><h1 style="color:#6554d9">New service request</h1><p><strong>Request ID:</strong> ${safeRequestIdHtml}</p><p><strong>Service:</strong> ${safeServiceNameHtml}</p><p><strong>Student:</strong> ${safeUsernameHtml}</p><p><strong>Student email:</strong> ${safeUserEmailHtml}</p><p><a href="${adminUrl}" style="display:inline-block;background:#6554d9;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Open admin requests</a></p></div>`,
    }),
  ]);
}
