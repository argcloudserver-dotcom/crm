import { Resend } from "resend";
import { logger } from "../logger";

const resend = process.env["RESEND_API_KEY"]
  ? new Resend(process.env["RESEND_API_KEY"])
  : null;

if (!resend) {
  logger.warn("RESEND_API_KEY not configured — emails will be logged only");
}

export const FROM_NAME = "TIL Real Estate";
export const FROM_EMAIL =
  process.env["SMTP_FROM"] ?? "noreply@crm.til-realestate.com";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function send(opts: SendEmailOptions): Promise<void> {
  if (!resend) {
    logger.info(
      { to: opts.to, subject: opts.subject },
      "Email (Resend not configured)",
    );
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      logger.error({ error }, "Resend email error");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send email via Resend");
  }
}