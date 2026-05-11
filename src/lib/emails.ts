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
  paperDeep: "#e6dabc",
  paperLight: "#faf4e2",
  ink: "#181512",
  inkSoft: "#544a3f",
  inkFaint: "#94897a",
  rule: "#d7cbb1",
  ruleSoft: "#e8dec7",
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
  <body style="margin:0;padding:0;background:${C.paper};color:${C.ink};font-family:${FONT_SERIF};-webkit-text-size-adjust:100%;text-size-adjust:100%;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${C.paper};">${pre}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:${C.paper};">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;background:${C.paperLight};border:1px solid ${C.rule};">
            <tr>
              <td style="padding:20px 26px 16px;border-bottom:1px solid ${C.rule};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td valign="middle" style="font-family:${FONT_SERIF};font-size:25px;line-height:1.1;letter-spacing:0;color:${C.ink};">
                      Chci<em style="color:${C.ember};font-style:italic;">Plech</em>
                    </td>
                    <td align="right" valign="middle" style="font-family:${FONT_MONO};font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${C.inkSoft};">
                      ${eye}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 26px 12px;">
                ${bodyHtml}
              </td>
            </tr>
            ${
              stamp
                ? `<tr><td align="left" style="padding:4px 26px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="padding:6px 12px;border:1px solid ${C.emberDeep};color:${C.emberDeep};font-family:${FONT_MONO};font-size:10px;font-weight:700;line-height:1.3;letter-spacing:0.14em;text-transform:uppercase;">${esc(stamp)}</td></tr></table></td></tr>`
                : ""
            }
            <tr>
              <td style="padding:16px 26px 20px;border-top:1px solid ${C.ruleSoft};font-family:${FONT_MONO};font-size:10px;line-height:1.55;letter-spacing:0.12em;text-transform:uppercase;color:${C.inkFaint};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td>ChciPlech · pro parťáky z kanceláře</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="max-width:600px;width:100%;margin:14px auto 0;font-family:${FONT_SERIF};font-size:12px;line-height:1.5;color:${C.inkFaint};text-align:center;">
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;border-collapse:collapse;">
    <tr>
      <td bgcolor="${C.ember}" style="background:${C.ember};border:1px solid ${C.emberDeep};">
        <a href="${h}" target="_blank" style="display:inline-block;padding:14px 22px;font-family:${FONT_MONO};font-size:12px;font-weight:700;line-height:1.2;letter-spacing:0.12em;text-transform:uppercase;color:${C.paperLight};text-decoration:none;">${l}</a>
      </td>
    </tr>
  </table>`;
}

function noteBox(innerHtml: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:8px 0 18px;border-collapse:collapse;background:${C.paper};border:1px solid ${C.ruleSoft};">
    <tr>
      <td style="padding:14px 16px;font-family:${FONT_SERIF};font-size:14px;line-height:1.55;color:${C.inkSoft};">${innerHtml}</td>
    </tr>
  </table>`;
}

function textBlock(html: string, marginBottom = 16) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td style="padding:0 0 ${marginBottom}px;font-family:${FONT_SERIF};font-size:16px;line-height:1.6;color:${C.inkSoft};">${html}</td></tr></table>`;
}

function eyebrowBlock(label: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td style="padding:0 0 9px;font-family:${FONT_MONO};font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${C.inkSoft};">${esc(label)}</td></tr></table>`;
}

function headingBlock(html: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td style="padding:0 0 14px;font-family:${FONT_SERIF};font-size:29px;line-height:1.15;font-weight:500;letter-spacing:0;color:${C.ink};">${html}</td></tr></table>`;
}

function linkLine(href: string) {
  const h = esc(href);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td style="padding:0 0 10px;font-family:${FONT_MONO};font-size:11px;line-height:1.5;color:${C.inkFaint};word-break:break-all;"><a href="${h}" style="color:${C.inkSoft};text-decoration:underline;">${h}</a></td></tr></table>`;
}

type DetailRow = {
  label: string;
  valueHtml: string;
};

function detailRows(rows: DetailRow[]) {
  const rowHtml = rows
    .map(
      (row, index) => `
        <tr>
          <td width="38%" style="width:38%;padding:${index === 0 ? "0" : "10px"} 0 10px;font-family:${FONT_MONO};font-size:10px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;color:${C.inkFaint};border-bottom:1px solid ${C.ruleSoft};">${esc(row.label)}</td>
          <td width="62%" align="right" style="width:62%;padding:${index === 0 ? "0" : "10px"} 0 10px 16px;font-family:${FONT_SERIF};font-size:14px;line-height:1.45;color:${C.inkSoft};border-bottom:1px solid ${C.ruleSoft};word-break:break-word;">${row.valueHtml}</td>
        </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:8px 0 18px;border-collapse:collapse;">${rowHtml}</table>`;
}

// ---------- magic link ----------

export async function sendMagicLinkEmail(data: { email: string; url: string }) {
  const url = data.url;

  const bodyHtml = `
    ${eyebrowBlock("magický odkaz")}
    ${headingBlock(`Přihlašovací odkaz do <em style="font-style:italic;color:${C.ember};">ChciPlechu</em>`)}
    ${textBlock("Tady je tvůj jednorázový odkaz. Otevři ho na zařízení, kde chceš zůstat přihlášený/přihlášená.")}
    ${primaryButton(url, "přihlásit se →")}
    ${linkLine(url)}
    ${detailRows([
      { label: "platnost", valueHtml: "jen krátce" },
      { label: "použití", valueHtml: "jedno kliknutí" },
      { label: "heslo", valueHtml: "není potřeba" },
    ])}
    ${noteBox("Kdybys o přihlášení nežádal(a), tenhle e-mail můžeš smazat.")}
  `;

  const html = renderPaperEmail({
    eyebrow: "magický odkaz",
    preheader: "Klikni a jsi uvnitř. Odkaz funguje jen chvíli.",
    bodyHtml,
    stamp: "jednorázový odkaz",
  });

  const text = [
    "ChciPlech — klikni a jsi uvnitř.",
    "",
    "Tady je tvůj jednorázový přihlašovací odkaz:",
    url,
    "",
    "Funguje jednou a vyprší. Kdybys o něj nežádal(a), smaž tenhle mail.",
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
  const roleLabel = data.role === "admin" ? "admin" : "člen party";
  const roleLabelHtml = esc(roleLabel);
  const emailHtml = esc(data.email);

  const subject = inviterRaw
    ? `${inviterRaw} tě zve do ChciPlechu`
    : "Máš pozvánku do ChciPlechu";

  const bodyHtml = `
    ${eyebrowBlock("pozvánka")}
    ${headingBlock(`Čau, <em style="font-style:italic;color:${C.ember};">${firstNameHtml}</em>!`)}
    ${textBlock(`<strong>${inviterHtml}</strong> tě přidal(a) do <strong>ChciPlechu</strong>. Je to společná police s pitím a svačinami, kde se odběry zapisují přes NFC štítky.`, 14)}
    ${textBlock("Na konci měsíce uvidíš přehled a QR platbu do české banky. Bez excelů a bez dohadování, kdo co koupil.", 18)}
    ${primaryButton(signInHref, "přihlásit se →")}
    ${detailRows([
      { label: "e-mail", valueHtml: `<span style="font-family:${FONT_MONO};font-size:12px;">${emailHtml}</span>` },
      { label: "přihlášení", valueHtml: "magický odkaz nebo Face ID" },
      { label: "role", valueHtml: `<em>${roleLabelHtml}</em>` },
    ])}
    ${noteBox("Po prvním přihlášení můžeš rovnou zapisovat odběry a koukat na svůj měsíční přehled.")}
  `;

  const html = renderPaperEmail({
    eyebrow: "pozvánka",
    preheader: `${inviterRaw ?? "Někdo z party"} tě přidal do ChciPlechu. Parta, co počítá plechovky.`,
    bodyHtml,
    stamp: "pozvánka aktivní",
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
