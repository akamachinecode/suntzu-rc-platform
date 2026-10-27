import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { Logger } from "@nestjs/common";
import { env } from "../env.js";

// Every email Servo sends goes through here: Amazon SES in production, the console locally
// (MAIL_TRANSPORT=log), so sign-in links and alerts can be followed without sending anything.

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** One-click unsubscribe (RFC 8058) for alerts and digests; never for sign-in links. */
  unsubscribeUrl?: string;
}

const logger = new Logger("Mail");
let ses: SESv2Client | undefined;

export async function sendMail(mail: Mail): Promise<void> {
  if (env.MAIL_TRANSPORT === "log") {
    // Local only: the text may hold a sign-in link. The address isn't logged (personal data).
    logger.log(`"${mail.subject}"\n${mail.text}`);
    return;
  }
  ses ??= new SESv2Client({ region: env.AWS_REGION });
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: env.MAIL_FROM,
      Destination: { ToAddresses: [mail.to] },
      Content: {
        Simple: {
          Subject: { Data: mail.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: mail.text, Charset: "UTF-8" },
            Html: { Data: mail.html, Charset: "UTF-8" },
          },
          ...(mail.unsubscribeUrl && {
            Headers: [
              { Name: "List-Unsubscribe", Value: `<${mail.unsubscribeUrl}>` },
              { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
            ],
          }),
        },
      },
    }),
  );
}

export interface EmailContent {
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Why they got it and how to stop it. */
  footer: string;
}

/**
 * One simple layout for every email, as plain text and HTML. Emails can't use the site's CSS, so
 * the few colours here are inline and neutral (ink on paper, the brand's yellow for the button).
 */
export function renderEmail(content: EmailContent): { text: string; html: string } {
  const text = [
    content.heading,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(content.button ? [`${content.button.label}: ${content.button.url}`, ""] : []),
    "—",
    content.footer,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:22px;font-weight:900;letter-spacing:-0.5px;margin:0 0 24px">SERVO</p>
<h1 style="font-size:24px;line-height:1.2;margin:0 0 16px">${escape(content.heading)}</h1>
${content.paragraphs.map((paragraph) => `<p style="font-size:16px;line-height:1.5;margin:0 0 14px">${escape(paragraph)}</p>`).join("\n")}
${content.button ? `<p style="margin:24px 0"><a href="${escape(content.button.url)}" style="display:inline-block;background:#ffd400;color:#1a1a1a;font-weight:700;text-decoration:none;padding:12px 18px;border:2px solid #1a1a1a;border-radius:6px">${escape(content.button.label)}</a></p>` : ""}
<p style="font-size:13px;line-height:1.5;color:#555;margin:32px 0 0;border-top:1px solid #ccc;padding-top:12px">${escape(content.footer)}</p>
</div></body></html>`;
  return { text, html };
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
