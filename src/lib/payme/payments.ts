import QRCode from "qrcode";

import { PaymeError } from "@/lib/payme/errors";

type CzechAccount = {
  accountPrefix?: string | null;
  accountNumber: string;
  bankCode: string;
};

function escapeField(value: string) {
  return value.replaceAll("*", "");
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
    throw new PaymeError(400, "Payout account is incomplete.");
  }

  return normalizedPrefix
    ? `${normalizedPrefix}-${normalizedNumber}/${normalizedBankCode}`
    : `${normalizedNumber}/${normalizedBankCode}`;
}

export function buildSpdPayload(input: {
  accountPrefix?: string | null;
  accountNumber: string;
  bankCode: string;
  amountMinor: number;
  message: string;
}) {
  const amount = (input.amountMinor / 100).toFixed(2);
  const acc = buildCzechAccount(input);

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
