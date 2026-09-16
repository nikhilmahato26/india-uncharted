import "server-only";

/**
 * Email adapter. `log` prints to the server log (development and until SMTP
 * credentials arrive); `smtp` sends through nodemailer. A failure here is
 * logged and swallowed: the enquiry is already saved.
 */

type EnquiryAlert = {
  refCode: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  entityName: string | null;
  sourcePath: string | null;
  adminUrl: string;
};

export async function sendEnquiryAlert(alert: EnquiryAlert): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "log";
  const to = process.env.EMAIL_TO_ENQUIRIES;
  const lines = [
    `New enquiry ${alert.refCode}`,
    "",
    `Name:    ${alert.name}`,
    `Email:   ${alert.email}`,
    `Phone:   ${alert.phone ?? "—"}`,
    `About:   ${alert.entityName ?? "General enquiry"}`,
    `Page:    ${alert.sourcePath ?? "—"}`,
    "",
    alert.message ?? "(no message)",
    "",
    `Open in admin: ${alert.adminUrl}`,
  ];

  try {
    if (provider === "smtp" && process.env.SMTP_URL && to) {
      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport(process.env.SMTP_URL);
      await transport.sendMail({
        from: process.env.EMAIL_FROM ?? to,
        to,
        replyTo: alert.email,
        subject: `Enquiry ${alert.refCode} — ${alert.entityName ?? alert.name}`,
        text: lines.join("\n"),
      });
      return;
    }
    console.info(`[email:${provider}]\n${lines.join("\n")}`);
  } catch (err) {
    console.error("enquiry alert failed to send", err);
  }
}
