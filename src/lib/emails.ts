import { env } from "@/lib/env";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  consoleLabel: string;
};

async function sendEmail(input: MailInput) {
  if (env.PAYME_MAGIC_LINK_EMAIL_MODE === "console") {
    console.log(`[${input.consoleLabel}] ${input.to}`);
    console.log(input.text);
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
      text: input.text,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${responseBody}`);
  }
}

// ---------- helpers ----------

function esc(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// brand tokens (mirror src/app/globals.css)
const C = {
  paper: "#f1e9d3",
  paperLight: "#f8f3e3",
  ink: "#181512",
  inkSoft: "#544a3f",
  inkFaint: "#94897a",
  rule: "rgba(24,21,18,0.14)",
  ember: "#d9481a",
  emberDeep: "#a32f10",
  mossDeep: "#33491a",
} as const;

const FONT_SERIF = `Georgia, "Times New Roman", Times, serif`;
const FONT_MONO = `"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace`;

type PaperEmailOpts = {
  eyebrow: string;
  preheader: string;
  bodyHtml: string; // already-escaped / trusted HTML for the body
  stamp?: string;
};

function renderPaperEmail({ eyebrow, preheader, bodyHtml, stamp }: PaperEmailOpts): string {
  const eye = esc(eyebrow);
  const pre = esc(preheader);

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>ChciPlech</title>
  </head>
  <body style="margin:0;padding:0;background:${C.paper};color:${C.ink};font-family:${FONT_SERIF};">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${C.paper};">${pre}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
      <tr>
        <td align="center" style="padding:28px 14px 32px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${C.paperLight};border:1px solid ${C.rule};">
            <tr>
              <td style="padding:22px 24px 14px;border-bottom:1px solid ${C.ink};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:${FONT_SERIF};font-size:26px;line-height:1;letter-spacing:-0.02em;color:${C.ink};">
                      Chci<em style="color:${C.ember};font-style:italic;">Plech</em><span style="color:${C.ember};font-size:22px;">&nbsp;●</span>
                    </td>
                    <td align="right" style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${C.inkSoft};">
                      ${eye}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px;font-family:${FONT_SERIF};font-size:16px;line-height:1.55;color:${C.ink};">
                ${bodyHtml}
              </td>
            </tr>
            ${
              stamp
                ? `<tr><td align="center" style="padding:6px 24px 22px;"><span style="display:inline-block;padding:6px 14px;border:1.5px solid ${C.emberDeep};color:${C.emberDeep};font-family:${FONT_MONO};font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">${esc(stamp)}</span></td></tr>`
                : ""
            }
            <tr>
              <td style="padding:14px 24px 18px;border-top:1px solid ${C.rule};font-family:${FONT_MONO};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${C.inkFaint};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>ChciPlech · pro parťáky z kanceláře</td>
                    <td align="right">cz</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;width:100%;margin:14px auto 0;font-family:${FONT_SERIF};font-size:12px;line-height:1.5;color:${C.inkFaint};text-align:center;">
            Kdyby ti to přišlo omylem, klidně to smaž. Nikdo se neurazí.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function primaryButton(href: string, label: string) {
  const h = esc(href);
  const l = esc(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">
    <tr>
      <td bgcolor="${C.ember}" style="background:${C.ember};border:1.5px solid ${C.ember};">
        <a href="${h}" target="_blank" style="display:inline-block;padding:13px 22px;font-family:${FONT_MONO};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.paperLight};text-decoration:none;">${l}</a>
      </td>
    </tr>
  </table>`;
}

function noteBox(innerHtml: string) {
  return `<div style="padding:12px 14px;border-left:3px solid ${C.ember};background:${C.paper};font-family:${FONT_SERIF};font-size:14px;line-height:1.55;color:${C.inkSoft};margin:10px 0 18px;">${innerHtml}</div>`;
}

// ---------- magic link ----------

export async function sendMagicLinkEmail(data: { email: string; url: string }) {
  const url = data.url;
  const urlHtml = esc(url);

  const bodyHtml = `
    <div style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${C.inkSoft};margin-bottom:8px;">§ magický odkaz</div>
    <h1 style="margin:0 0 10px;font-family:${FONT_SERIF};font-size:30px;line-height:1.02;font-weight:500;letter-spacing:-0.02em;color:${C.ink};">
      Klikni a jsi <em style="font-style:italic;color:${C.ember};">uvnitř</em>.
    </h1>
    <p style="margin:0 0 16px;color:${C.inkSoft};">
      Tady je tvůj jednorázový přihlašovací odkaz. Funguje jednou a chvíli — tak ať ti nevystydne.
    </p>
    ${primaryButton(url, "přihlásit se →")}
    <p style="margin:0 0 6px;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.08em;color:${C.inkFaint};word-break:break-all;">
      <a href="${urlHtml}" style="color:${C.inkSoft};text-decoration:underline;">${urlHtml}</a>
    </p>
    ${noteBox(`
      — odkaz vyprší, tak si pospěš<br>
      — jedno kliknutí, pak je po něm<br>
      — kdybys to nebyl(a) ty, smaž tenhle mail a klidně se nám ozvi
    `)}
  `;

  const html = renderPaperEmail({
    eyebrow: "magický odkaz",
    preheader: "Klikni a jsi uvnitř. Odkaz funguje jen chvíli.",
    bodyHtml,
    stamp: "jen jeden klik",
  });

  const text = [
    "ChciPlech — klikni a jsi uvnitř.",
    "",
    "Tady je tvůj jednorázový přihlašovací odkaz:",
    url,
    "",
    "Funguje jednou a vyprší. Kdyby to nebyl(a) jsi ty, smaž tenhle mail.",
    "",
    "— ChciPlech, pro parťáky z kanceláře",
  ].join("\n");

  await sendEmail({
    to: data.email,
    subject: "ChciPlech · klikni a jsi uvnitř",
    html,
    text,
    consoleLabel: "chciplech-magic-link",
  });
}

// ---------- invite ----------

export async function sendInviteEmail(data: {
  email: string;
  displayName: string;
  role: "admin" | "member";
  invitedByName?: string;
}) {
  const signInUrl = new URL("/sign-in", env.PAYME_BASE_URL);
  signInUrl.searchParams.set("email", data.email);
  const signInHref = signInUrl.toString();

  const firstName = (data.displayName.trim().split(/\s+/)[0] ?? "").trim() || "parťáku";
  const firstNameHtml = esc(firstName);
  const inviterRaw = data.invitedByName?.trim();
  const inviterHtml = inviterRaw ? esc(inviterRaw) : "Někdo z party";
  const roleLabel = data.role === "admin" ? "admin (velíš vajíčku)" : "člen party";
  const roleLabelHtml = esc(roleLabel);
  const emailHtml = esc(data.email);

  const subject = inviterRaw
    ? `${inviterRaw} tě zve do ChciPlechu`
    : "Máš pozvánku do ChciPlechu";

  const bodyHtml = `
    <div style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${C.inkSoft};margin-bottom:8px;">§ pozvánka</div>
    <h1 style="margin:0 0 12px;font-family:${FONT_SERIF};font-size:32px;line-height:1.02;font-weight:500;letter-spacing:-0.02em;color:${C.ink};">
      Čau, <em style="font-style:italic;color:${C.ember};">${firstNameHtml}</em>!
    </h1>
    <p style="margin:0 0 14px;">
      <strong>${inviterHtml}</strong> tě zrovna vtáhl(a) do <strong>ChciPlechu</strong>. Vítej v partě.
    </p>
    <p style="margin:0 0 18px;color:${C.inkSoft};">
      Co to je? Parta z kanceláře, co si v kuchyni drží jednu polici plnou plechovek a svačin. Každý si bere, co chce — ťukne telefonem na NFC štítek a je to zapsáno. Na konci měsíce ti appka vyplivne QR platbu do české banky. Žádné excely. Žádné hádání, kdo vlastně koupil tu kolu.
    </p>
    ${primaryButton(signInHref, "přihlásit se →")}
    ${noteBox(`
      — tvůj e-mail <span style="font-family:${FONT_MONO};font-size:12px;">${emailHtml}</span> už máme na seznamu<br>
      — žádná hesla, nikdy — stačí magický odkaz, nebo Face ID<br>
      — role: <em>${roleLabelHtml}</em>
    `)}
    <p style="margin:14px 0 0;color:${C.inkSoft};font-size:14px;">
      Mimochodem: jméno appky je doslova „chci plech&#8201;″. Tak se moc nediv, až se ti první ráno připomene, že máš žízeň.
    </p>
  `;

  const html = renderPaperEmail({
    eyebrow: "pozvánka",
    preheader: `${inviterRaw ?? "Někdo z party"} tě přidal do ChciPlechu. Parta, co počítá plechovky.`,
    bodyHtml,
    stamp: "plechovky na tebe čekají",
  });

  const text = [
    `Čau ${firstName},`,
    "",
    `${inviterRaw ?? "Někdo z party"} tě přidal do ChciPlechu — parta z kanceláře, co si drží polici plnou plechovek a svačin.`,
    "",
    "Každý si bere, co chce (ťukem telefonu na NFC štítek), a na konci měsíce ti appka vyplivne QR platbu pro tvou banku. Žádné excely.",
    "",
    "Přihlas se tady:",
    signInHref,
    "",
    `Tvůj e-mail ${data.email} už máme na seznamu. Role: ${roleLabel}.`,
    "",
    "— ChciPlech, pro parťáky z kanceláře",
  ].join("\n");

  await sendEmail({
    to: data.email,
    subject,
    html,
    text,
    consoleLabel: "chciplech-invite",
  });
}
