import { send } from "./client";
import { baseTemplate, brandColor } from "./templates";

export async function sendVerificationCode(
  to: string,
  name: string,
  code: string,
): Promise<void> {
  await send({
    to,
    subject: "Your PropOS verification code",
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 8px">Verify your email</h2>
      <p style="color:#94A3B8;margin:0 0 24px">Hi ${name}, use the code below to verify your email. It expires in <strong style="color:#F1F5F9">15 minutes</strong>.</p>
      <div style="font-size:40px;font-weight:800;letter-spacing:12px;text-align:center;padding:24px;background:#0F172A;border-radius:10px;margin:0 0 24px;color:${brandColor};border:2px solid ${brandColor}">
        ${code}
      </div>
      <p style="color:#64748B;font-size:13px;margin:0">If you didn't create an account, you can safely ignore this email.</p>
    `),
  });
}

export async function sendWelcomePendingApproval(
  to: string,
  name: string,
): Promise<void> {
  await send({
    to,
    subject: "Account created — awaiting admin approval",
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 8px">You're almost in! 🎉</h2>
      <p style="color:#94A3B8;margin:0 0 16px">Hi ${name},</p>
      <p style="color:#94A3B8;margin:0 0 16px">Your email has been verified successfully. Your account is now <strong style="color:${brandColor}">pending admin approval</strong>.</p>
      <p style="color:#94A3B8;margin:0">You'll receive another email as soon as your account is activated.</p>
    `),
  });
}

export async function sendAdminNewUserAlert(
  adminEmails: string[],
  newUserName: string,
  newUserEmail: string,
  role: string,
): Promise<void> {
  if (adminEmails.length === 0) return;
  await send({
    to: adminEmails.join(", "),
    subject: `New user awaiting approval: ${newUserName}`,
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 16px">New registration pending approval</h2>
      <p style="color:#94A3B8;margin:0 0 20px">A new user has verified their email and is waiting for your approval:</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin:0 0 20px">
        <p style="margin:0 0 8px;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Name:</span> ${newUserName}</p>
        <p style="margin:0 0 8px;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Email:</span> ${newUserEmail}</p>
        <p style="margin:0;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Role:</span> ${role}</p>
      </div>
      <a href="${process.env["APP_URL"] ?? ""}/employees/pending" style="display:inline-block;background:${brandColor};color:#0F172A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Review in PropOS CRM</a>
    `),
  });
}

export async function sendPasswordResetLink(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  await send({
    to,
    subject: "Reset your PropOS CRM password",
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 8px">Password reset request</h2>
      <p style="color:#94A3B8;margin:0 0 16px">Hi ${name},</p>
      <p style="color:#94A3B8;margin:0 0 24px">We received a request to reset your password. Click the button below — it expires in <strong style="color:#F1F5F9">1 hour</strong>.</p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${resetUrl}" style="display:inline-block;background:${brandColor};color:#0F172A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Reset Password</a>
      </div>
      <p style="color:#64748B;font-size:13px;margin:0">If you didn't request a reset, you can safely ignore this email.</p>
    `),
  });
}

export async function sendAccountApprovedEmail(
  to: string,
  name: string,
  appUrl: string,
): Promise<void> {
  await send({
    to,
    subject: "Your PropOS account has been approved! 🎉",
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 8px">Welcome to PropOS CRM! 🎉</h2>
      <p style="color:#94A3B8;margin:0 0 16px">Hi ${name},</p>
      <p style="color:#94A3B8;margin:0 0 24px">Great news! Your account has been <strong style="color:#22C55E">approved</strong>. You can now log in and start using the platform.</p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${appUrl}/login" style="display:inline-block;background:${brandColor};color:#0F172A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Log in to PropOS</a>
      </div>
    `),
  });
}

export async function sendAccountRejectedEmail(
  to: string,
  name: string,
  reason: string | null,
): Promise<void> {
  await send({
    to,
    subject: "PropOS account application update",
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 8px">Account Application Update</h2>
      <p style="color:#94A3B8;margin:0 0 16px">Hi ${name},</p>
      <p style="color:#94A3B8;margin:0 0 16px">Unfortunately, your PropOS CRM account application was not approved at this time.</p>
      ${reason ? `<div style="background:#0F172A;border-radius:8px;padding:16px;margin:0 0 16px"><p style="margin:0;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Reason:</span> ${reason}</p></div>` : ""}
      <p style="color:#64748B;font-size:13px;margin:0">If you believe this is an error, please contact your administrator.</p>
    `),
  });
}
