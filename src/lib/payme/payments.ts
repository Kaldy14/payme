import QRCode from "qrcode";

import { PaymeError } from "@/lib/payme/errors";

type CzechAccount = {
  accountPrefix?: string | null;
  accountNumber: string;
  bankCode: string;
  iban?: string | null;
};

function escapeField(value: string) {
  return Array.from(value)
    .map((char) => {
      if (char === "*") {
        return "%2A";
      }
      if (/^[\x20-\x7E]$/.test(char)) {
        return char;
      }

      return encodeURIComponent(char);
    })
    .join("");
}

function normalizeDigits(value: string, field: string, maxLength: number) {
  const normalized = value.replace(/\s/g, "");
  if (!/^\d+$/.test(normalized)) {
    throw new PaymeError(400, `${field} smí obsahovat jen číslice.`);
  }
  if (normalized.length > maxLength) {
    throw new PaymeError(400, `${field} je moc dlouhé.`);
  }

  return normalized;
}

function mod97(value: string) {
  let remainder = 0;

  for (const char of value) {
    remainder = (remainder * 10 + Number(char)) % 97;
  }

  return remainder;
}

function ibanNumericValue(value: string) {
  return Array.from(value)
    .map((char) => {
      if (/[A-Z]/.test(char)) {
        return String(char.charCodeAt(0) - 55);
      }

      return char;
    })
    .join("");
}

function isValidIban(value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();

  if (!/^CZ\d{22}$/.test(normalized)) {
    return false;
  }

  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
  return mod97(ibanNumericValue(rearranged)) === 1;
}

function normalizeIban(value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();

  if (!isValidIban(normalized)) {
    throw new PaymeError(400, "IBAN není platný český účet.");
  }

  return normalized;
}

export function buildCzechIban({
  accountPrefix,
  accountNumber,
  bankCode,
}: CzechAccount) {
  const normalizedPrefix = accountPrefix
    ? normalizeDigits(accountPrefix, "Předčíslí", 6).padStart(6, "0")
    : "000000";
  const normalizedNumber = normalizeDigits(accountNumber, "Číslo účtu", 10).padStart(10, "0");
  const normalizedBankCode = normalizeDigits(bankCode, "Kód banky", 4);

  if (normalizedBankCode.length !== 4) {
    throw new PaymeError(400, "Kód banky musí mít 4 číslice.");
  }

  const bban = `${normalizedBankCode}${normalizedPrefix}${normalizedNumber}`;
  const checkDigits = String(98 - mod97(ibanNumericValue(`${bban}CZ00`))).padStart(2, "0");

  return `CZ${checkDigits}${bban}`;
}

export function buildCzechAccount({
  accountPrefix,
  accountNumber,
  bankCode,
}: CzechAccount) {
  const normalizedPrefix = accountPrefix?.trim() || "";
  const normalizedNumber = accountNumber.trim();
  const normalizedBankCode = bankCode.trim();

  if (!normalizedNumber || !normalizedBankCode) {
    throw new PaymeError(400, "Doplň bankovní účet.");
  }

  return normalizedPrefix
    ? `${normalizedPrefix}-${normalizedNumber}/${normalizedBankCode}`
    : `${normalizedNumber}/${normalizedBankCode}`;
}

export function buildSpdAccount(input: CzechAccount) {
  const iban = buildCzechIban(input);

  if (!input.iban) {
    return iban;
  }

  const normalizedIban = normalizeIban(input.iban);
  if (normalizedIban !== iban) {
    throw new PaymeError(400, "IBAN nesedí s číslem účtu.");
  }

  return normalizedIban;
}

export function buildSpdPayload(input: {
  accountPrefix?: string | null;
  accountNumber: string;
  bankCode: string;
  iban?: string | null;
  amountMinor: number;
  message: string;
}) {
  const amount = (input.amountMinor / 100).toFixed(2);
  const acc = buildSpdAccount(input);

  return [
    "SPD*1.0",
    `ACC:${escapeField(acc)}`,
    `AM:${amount}`,
    "CC:CZK",
    `MSG:${escapeField(input.message)}`,
  ].join("*");
}

export async function buildSpdQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 320,
  });
}
