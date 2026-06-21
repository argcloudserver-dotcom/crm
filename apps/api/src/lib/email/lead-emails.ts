import { send } from "./client";
import { baseTemplate, brandColor } from "./templates";

export async function sendLeadAssignedEmail(
  to: string,
  salesName: string,
  leadName: string,
  leadPhone: string,
  projectName: string | null,
  appUrl: string,
): Promise<void> {
  await send({
    to,
    subject: `New lead assigned to you: ${leadName}`,
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 8px">New Lead Assigned 🎯</h2>
      <p style="color:#94A3B8;margin:0 0 16px">Hi ${salesName}, a new lead has been assigned to you:</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin:0 0 20px">
        <p style="margin:0 0 8px;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Lead:</span> ${leadName}</p>
        <p style="margin:0 0 8px;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Phone:</span> ${leadPhone}</p>
        ${projectName ? `<p style="margin:0;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Project:</span> ${projectName}</p>` : ""}
      </div>
      <a href="${appUrl}/leads" style="display:inline-block;background:${brandColor};color:#0F172A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View Lead in PropOS</a>
    `),
  });
}

export async function sendLeadStatusChangedEmail(
  to: string,
  salesName: string,
  leadName: string,
  oldStatus: string,
  newStatus: string,
  appUrl: string,
): Promise<void> {
  const isWon = newStatus === "won";
  const emoji = isWon ? "🏆" : newStatus === "lost" ? "😔" : "📊";
  await send({
    to,
    subject: `Lead status updated: ${leadName} → ${newStatus}`,
    html: baseTemplate(`
      <h2 style="color:#F1F5F9;margin:0 0 8px">Lead Status Updated ${emoji}</h2>
      <p style="color:#94A3B8;margin:0 0 16px">Hi ${salesName},</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin:0 0 20px">
        <p style="margin:0 0 8px;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Lead:</span> ${leadName}</p>
        <p style="margin:0 0 8px;color:#94A3B8"><span style="color:${brandColor};font-weight:600">Previous status:</span> ${oldStatus}</p>
        <p style="margin:0;color:#94A3B8"><span style="color:${brandColor};font-weight:600">New status:</span> <span style="color:${isWon ? "#22C55E" : "#F1F5F9"}">${newStatus}</span></p>
      </div>
      ${isWon ? `<p style="color:#22C55E;font-weight:600;margin:0 0 20px">Congratulations on closing the deal! 🎉</p>` : ""}
      <a href="${appUrl}/leads" style="display:inline-block;background:${brandColor};color:#0F172A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View in PropOS</a>
    `),
  });
}
