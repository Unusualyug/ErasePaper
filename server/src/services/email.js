import config from '../config/env.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 8000;
const BRAND = {
  name: 'ErasePaper',
  purple: '#6554d9',
  ink: '#182230',
  muted: '#667085',
  page: '#f3f5fb',
  line: '#e7eaf1',
  support: 'support@erasepaper.online',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character];
  });
}

function brandedEmail({
  preview,
  label,
  title,
  intro,
  content,
  buttonUrl,
  buttonLabel,
  note,
  footerText,
  helpHtml,
}) {
  const safePreview = escapeHtml(preview);
  const safeLabel = escapeHtml(label);
  const safeTitle = escapeHtml(title);
  const safeButtonUrl = escapeHtml(buttonUrl);
  const safeButtonLabel = escapeHtml(buttonLabel);
  const safeNote = escapeHtml(note);
  const safeFooterText = escapeHtml(
    footerText || 'You received this transactional message because of activity on your ErasePaper account.',
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.page};font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${safePreview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${BRAND.page};">
      <tr>
        <td align="center" style="padding:34px 12px 38px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:18px;overflow:hidden;">
            <tr><td height="5" style="height:5px;background:${BRAND.purple};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid ${BRAND.line};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="42" valign="middle" style="width:42px;">
                      <table role="presentation" width="36" height="36" cellpadding="0" cellspacing="0" border="0" style="width:36px;height:36px;background:${BRAND.purple};border-radius:11px;">
                        <tr><td align="center" valign="middle" style="font-size:19px;line-height:36px;font-weight:700;color:#ffffff;">E</td></tr>
                      </table>
                    </td>
                    <td valign="middle" style="padding-left:10px;">
                      <div style="font-size:17px;line-height:22px;font-weight:700;letter-spacing:-.3px;color:${BRAND.ink};">${BRAND.name}</div>
                      <div style="padding-top:2px;font-size:9px;line-height:13px;font-weight:700;letter-spacing:1.1px;color:${BRAND.muted};">SIMPLIFYING ACADEMIC LIFE</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 30px;">
                <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f0edff;color:${BRAND.purple};font-size:10px;line-height:14px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">${safeLabel}</div>
                <h1 style="margin:18px 0 12px;font-size:29px;line-height:36px;font-weight:700;letter-spacing:-.7px;color:${BRAND.ink};">${safeTitle}</h1>
                ${intro}
                ${content}
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:25px;">
                  <tr>
                    <td align="center" bgcolor="${BRAND.purple}" style="border-radius:9px;background:${BRAND.purple};">
                      <a href="${safeButtonUrl}" style="display:inline-block;padding:14px 21px;border:1px solid ${BRAND.purple};border-radius:9px;color:#ffffff;font-size:14px;line-height:18px;font-weight:700;text-decoration:none;">${safeButtonLabel}</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background:#f8f7ff;border:1px solid #ebe8ff;border-radius:12px;">
                  <tr>
                    <td style="padding:15px 17px;font-size:13px;line-height:20px;color:#49436f;">${safeNote}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:19px 32px 22px;border-top:1px solid ${BRAND.line};background:#fcfcfe;">
                ${helpHtml || `<p style="margin:0 0 7px;font-size:12px;line-height:18px;color:${BRAND.muted};">Need a hand? Reply to this email or contact <a href="mailto:${BRAND.support}" style="color:${BRAND.purple};text-decoration:underline;">${BRAND.support}</a>.</p>`}
                <p style="margin:0;font-size:11px;line-height:17px;color:#98a2b3;">${safeFooterText}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:10px;line-height:16px;color:#98a2b3;">${BRAND.name} · Simplifying Academic Life</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
  const note =
    'Your account is ready to use right away. Email addresses are not verified, and this message is not an email-verification request.';
  const html = brandedEmail({
    preview: 'Your ErasePaper account is ready. Sign in to explore your academic support workspace.',
    label: 'Account created',
    title: 'Welcome to ErasePaper',
    intro: `<p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${BRAND.ink};">Hi ${safeUsername},</p><p style="margin:0;font-size:14px;line-height:23px;color:${BRAND.muted};">Your account is ready. Explore services, submit a request, and follow its progress from your dashboard.</p>`,
    content: '',
    buttonUrl: signInUrl,
    buttonLabel: 'Open your account',
    note,
    footerText: 'You received this email because an ErasePaper account was created with this address.',
  });

  return sendEmail({
    to: user.email,
    subject: 'Welcome to ErasePaper — your account is ready',
    text: `Hi ${username},\n\nWelcome to ErasePaper. Your account is ready. Explore services, submit a request, and follow its progress at ${signInUrl}.\n\nYour account is ready to use right away. Email addresses are not verified, and this message is not an email-verification request.\n\nNeed help? Reply to this email or contact ${BRAND.support}.\n\nErasePaper · Simplifying Academic Life`,
    html,
  });
}

export async function sendPasswordResetEmail({ user, resetUrl, expiresMinutes }) {
  if (!user?.email || !resetUrl) return false;

  const username = escapeHtml(String(user.username || 'there'));
  const expiry = Number(expiresMinutes) || 20;
  const expiryNote = `This secure link can be used once and expires in ${expiry} minutes. If you did not request a password reset, you can safely ignore this email; your password will not change.`;
  const html = brandedEmail({
    preview: 'Use this secure link to choose a new ErasePaper password.',
    label: 'Password security',
    title: 'Reset your password',
    intro: `<p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${BRAND.ink};">Hi ${username},</p><p style="margin:0;font-size:14px;line-height:23px;color:${BRAND.muted};">We received a request to reset the password for your ErasePaper account. Use the secure button below to choose a new password.</p>`,
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:21px;border:1px solid ${BRAND.line};border-radius:12px;"><tr><td style="padding:15px 17px;"><div style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:.8px;color:${BRAND.muted};text-transform:uppercase;">What to expect</div><div style="padding-top:8px;font-size:13px;line-height:21px;color:${BRAND.ink};">Create a new password to secure your account. Your existing sessions will be signed out after the password changes.</div></td></tr></table>`,
    buttonUrl: resetUrl,
    buttonLabel: 'Choose a new password',
    note: expiryNote,
    footerText: 'For your security, ErasePaper will never ask you to send your password by email.',
  });

  return sendEmail({
    to: user.email,
    subject: 'Reset your ErasePaper password',
    text: `Hi ${user.username || 'there'},\n\nWe received a request to reset the password for your ErasePaper account. Use this secure link to choose a new password: ${resetUrl}\n\nThis link can be used once and expires in ${expiry} minutes. If you did not request a password reset, ignore this email; your password will not change.\n\nNeed help? Reply to this email or contact ${BRAND.support}.\n\nErasePaper · Simplifying Academic Life`,
    html,
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
  const requestNote = 'Your request is now in the ErasePaper system. Sign in any time to view its status.';

  const studentHtml = brandedEmail({
    preview: `We received your ${safeServiceName} request. Request ID ${safeRequestId}.`,
    label: 'Request received',
    title: 'We have your request',
    intro: `<p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${BRAND.ink};">Hi ${safeUsernameHtml},</p><p style="margin:0;font-size:14px;line-height:23px;color:${BRAND.muted};">Thanks for contacting ErasePaper. Your request has been received and is ready for review.</p>`,
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:21px;border:1px solid ${BRAND.line};border-radius:12px;"><tr><td style="padding:15px 17px;"><div style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:.8px;color:${BRAND.muted};text-transform:uppercase;">Request summary</div><div style="padding-top:8px;font-size:14px;line-height:21px;font-weight:700;color:${BRAND.ink};">${safeServiceNameHtml}</div><div style="padding-top:4px;font-size:12px;line-height:18px;color:${BRAND.muted};">Request ID: <strong style="color:${BRAND.ink};">${safeRequestIdHtml}</strong></div></td></tr></table>`,
    buttonUrl: requestsUrl,
    buttonLabel: 'View my requests',
    note: requestNote,
    footerText:
      'You received this email because a service request was submitted from your ErasePaper account.',
  });

  const supportHtml = brandedEmail({
    preview: `New ErasePaper request ${safeRequestId} requires review.`,
    label: 'New request',
    title: 'A student request is ready for review',
    intro:
      '<p style="margin:0;font-size:14px;line-height:23px;color:#667085;">A new service request was submitted through ErasePaper.</p>',
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:21px;border:1px solid ${BRAND.line};border-radius:12px;"><tr><td style="padding:15px 17px;"><div style="padding-bottom:11px;border-bottom:1px solid ${BRAND.line};font-size:10px;line-height:15px;font-weight:700;letter-spacing:.8px;color:${BRAND.muted};text-transform:uppercase;">Request details</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr><td style="padding:5px 0;font-size:12px;color:${BRAND.muted};">Request ID</td><td align="right" style="padding:5px 0;font-size:12px;font-weight:700;color:${BRAND.ink};">${safeRequestIdHtml}</td></tr><tr><td style="padding:5px 0;font-size:12px;color:${BRAND.muted};">Service</td><td align="right" style="padding:5px 0;font-size:12px;font-weight:700;color:${BRAND.ink};">${safeServiceNameHtml}</td></tr><tr><td style="padding:5px 0;font-size:12px;color:${BRAND.muted};">Student</td><td align="right" style="padding:5px 0;font-size:12px;font-weight:700;color:${BRAND.ink};">${safeUsernameHtml}</td></tr><tr><td style="padding:5px 0;font-size:12px;color:${BRAND.muted};">Student email</td><td align="right" style="padding:5px 0;font-size:12px;font-weight:700;color:${BRAND.ink};">${safeUserEmailHtml}</td></tr></table></td></tr></table>`,
    buttonUrl: adminUrl,
    buttonLabel: 'Review in admin dashboard',
    note: 'Open the admin dashboard to review the request and manage its status.',
    helpHtml:
      '<p style="margin:0 0 7px;font-size:12px;line-height:18px;color:#667085;">Reply to this email to contact the student who submitted the request.</p>',
    footerText: 'This operational notification is intended for authorized ErasePaper support staff.',
  });

  await Promise.all([
    sendEmail({
      to: user.email,
      subject: `Request received: ${safeServiceName} (${safeRequestId})`,
      text: `Hi ${safeUsername},\n\nThanks for contacting ErasePaper. Your ${safeServiceName} request has been received and is ready for review.\n\nRequest ID: ${safeRequestId}\n\nView your requests at ${requestsUrl}. For help, reply to this email or contact ${BRAND.support}.\n\nErasePaper · Simplifying Academic Life`,
      html: studentHtml,
    }),
    sendEmail({
      to: config.supportEmail,
      replyTo: user.email,
      subject: `New request for review: ${safeRequestId}`,
      text: `A new ErasePaper service request was submitted.\n\nRequest ID: ${safeRequestId}\nService: ${safeServiceName}\nStudent: ${safeUsername}\nStudent email: ${safeUserEmail}\n\nReview it in the admin dashboard: ${adminUrl}`,
      html: supportHtml,
    }),
  ]);
}
