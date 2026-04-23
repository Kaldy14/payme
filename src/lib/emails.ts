import { env } from "@/lib/env";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  consoleLabel: string;
};

async function sendEmail(input: MailInput) {
  if (env.PAYME_MAGIC_LINK_EMAIL_MODE === "console") {
    console.log(`[${input.consoleLabel}] ${input.to}`);
    return;
  }

  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when PAYME_MAGIC_LINK_EMAIL_MODE=resend");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.PAYME_MAGIC_LINK_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${responseBody}`);
  }
}

export async function sendMagicLinkEmail(data: { email: string; url: string }) {
  await sendEmail({
    to: data.email,
    subject: `${env.PAYME_APP_NAME} sign-in link`,
    html: `<p>Open this link to sign in to ${env.PAYME_APP_NAME}:</p><p><a href="${data.url}">${data.url}</a></p>`,
    consoleLabel: "payme-magic-link",
  });
}

export async function sendInviteEmail(data: {
  email: string;
  displayName: string;
  role: "admin" | "member";
  invitedByName?: string;
}) {
  const signInUrl = new URL("/sign-in", env.PAYME_BASE_URL);
  signInUrl.searchParams.set("email", data.email);

  const roleLabel = data.role === "admin" ? "admin" : "člen";
  const inviterLine = data.invitedByName
    ? `<p>Pozval(a) tě <strong>${data.invitedByName}</strong>.</p>`
    : "";

  await sendEmail({
    to: data.email,
    subject: `${env.PAYME_APP_NAME} pozvánka`,
    html: `
      <p>Ahoj ${data.displayName},</p>
      <p>byl(a) jsi přidaný/á do ${env.PAYME_APP_NAME} jako <strong>${roleLabel}</strong>.</p>
      ${inviterLine}
      <p>Otevři tenhle odkaz a pošli si magický přihlašovací odkaz:</p>
      <p><a href="${signInUrl.toString()}">${signInUrl.toString()}</a></p>
    `,
    consoleLabel: "payme-invite",
  });
}
