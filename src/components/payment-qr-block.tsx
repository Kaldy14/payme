"use client";

import { useState } from "react";

type PaymentQrBlockProps = {
  dataUrl: string;
  message: string;
  className?: string;
};

function fileNameFromMessage(message: string) {
  const suffix = message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `chciplech-qr-${suffix || "platba"}.png`;
}

function fileFromDataUrl(dataUrl: string, fileName: string) {
  const [header, payload] = dataUrl.split(",");
  const match = /^data:([^;,]+)(;base64)?$/i.exec(header ?? "");

  if (!match || !payload) {
    throw new Error("QR obrázek nejde načíst.");
  }

  const mimeType = match[1] ?? "image/png";
  const binary = match[2] ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mimeType });
}

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PaymentQrBlock({
  dataUrl,
  message,
  className = "",
}: PaymentQrBlockProps) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function shareQr() {
    setPending(true);
    setNotice(null);

    try {
      const file = fileFromDataUrl(dataUrl, fileNameFromMessage(message));
      const shareData: ShareData = {
        files: [file],
        title: "QR platba",
        text: message,
      };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setNotice("QR je předané do sdílení.");
      } else {
        saveFile(file);
        setNotice("QR uložené jako PNG.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice(null);
      } else {
        setNotice(error instanceof Error ? error.message : "QR nejde sdílet.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="paper-card-flat p-2 border-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={`QR platba - ${message}`}
          className="h-[140px] w-[140px] sm:h-[170px] sm:w-[170px] block"
        />
      </div>
      <div className="eyebrow text-ink-faint">sken - SPD 1.0</div>
      <button
        type="button"
        onClick={shareQr}
        disabled={pending}
        className="btn btn-ghost btn-sm w-full max-w-[170px]"
      >
        {pending ? "sdílím..." : "sdílet QR"}
      </button>
      {notice && (
        <div
          role="status"
          className="max-w-[170px] text-center text-[0.78rem] text-ink-soft"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
