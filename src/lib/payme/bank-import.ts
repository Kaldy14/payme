import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

import { firstRow, pool, withTransaction } from "@/lib/db/pool";
import { env } from "@/lib/env";
import type { MemberRecord } from "@/lib/payme/authz";
import { PaymeError } from "@/lib/payme/errors";
import { createId } from "@/lib/payme/ids";

export type BankMatchStatus =
  | "matched"
  | "duplicate"
  | "unmatched"
  | "problem"
  | "ignored";

export type BankImportRowSummary = {
  rowNumber: number;
  status: BankMatchStatus;
  problemCode: string | null;
  amountMinor: number;
  currency: string;
  variableSymbol: string | null;
  paymentCode: string | null;
  message: string | null;
  matchedSettlementLineId: string | null;
};

export type BankImportSummary = {
  importId: string;
  fileName: string | null;
  fileSha256: string;
  alreadyImported: boolean;
  rowCount: number;
  matched: number;
  duplicates: number;
  unmatched: number;
  problem: number;
  ignored: number;
  rows: BankImportRowSummary[];
};

type CsvRow = {
  rowNumber: number;
  rawFields: Record<string, string>;
  fields: Map<string, string>;
};

type NormalizedBankRow = {
  rowNumber: number;
  rawFields: Record<string, string>;
  bookedAt: string | null;
  amountMinor: number;
  currency: string;
  variableSymbol: string | null;
  paymentCode: string | null;
  message: string | null;
  counterpartyAccount: string | null;
  counterpartyName: string | null;
  transactionFingerprint: string;
  problemCode: string | null;
};

type ExistingImportRow = {
  id: string;
  file_name: string | null;
  file_sha256: string;
  row_count: number;
  summary: BankImportSummary;
};

type ExistingBankTransactionRow = {
  id: string;
  match_status: BankMatchStatus;
  problem_code: string | null;
  matched_settlement_line_id: string | null;
};

type SettlementMatchRow = {
  id: string;
  status: "open" | "paid";
  amount_minor: number;
  variable_symbol: string;
};

const delimiterCandidates = [";", ",", "\t"] as const;
const amountColumns = ["castka", "amount", "objem", "suma"];
const currencyColumns = ["mena", "currency", "ccy"];
const variableSymbolColumns = [
  "vs",
  "variabilnisymbol",
  "variabilnisymbolplatby",
  "varsymbol",
  "variablesymbol",
];
const messageColumns = [
  "zpravaprijemce",
  "zpravaproprijemce",
  "zprava",
  "poznamka",
  "komentar",
  "ucelplatby",
  "message",
  "reference",
  "description",
];
const bookedAtColumns = [
  "datum",
  "datumzauctovani",
  "datumplatby",
  "datumpohybu",
  "bookingdate",
  "bookedat",
];
const transactionIdColumns = [
  "idtransakce",
  "identifikatortransakce",
  "transactionid",
  "id",
];
const counterpartyAccountColumns = [
  "protiucet",
  "ucetprotistrany",
  "counterpartyaccount",
  "account",
];
const counterpartyNameColumns = [
  "nazevprotistrany",
  "protistrana",
  "odesilatel",
  "counterpartyname",
  "payer",
];

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(headerLine: string) {
  let bestDelimiter: (typeof delimiterCandidates)[number] = ";";
  let bestCount = -1;

  for (const delimiter of delimiterCandidates) {
    const count = Array.from(headerLine).filter((char) => char === delimiter).length;
    if (count > bestCount) {
      bestDelimiter = delimiter;
      bestCount = count;
    }
  }

  return bestDelimiter;
}

function firstPhysicalLine(value: string) {
  const index = value.search(/\r?\n/);
  return index === -1 ? value : value.slice(0, index);
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let fieldStart = true;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"" && fieldStart) {
      quoted = true;
      fieldStart = false;
      continue;
    }

    if (char === delimiter) {
      record.push(field);
      field = "";
      fieldStart = true;
      continue;
    }

    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      record.push(field);
      if (record.some((cell) => cell.trim() !== "")) {
        rows.push(record);
      }
      record = [];
      field = "";
      fieldStart = true;
      continue;
    }

    field += char;
    fieldStart = false;
  }

  record.push(field);
  if (record.some((cell) => cell.trim() !== "")) {
    rows.push(record);
  }

  if (quoted) {
    throw new PaymeError(400, "CSV má neuzavřené uvozovky.");
  }

  return rows;
}

function parseCsv(text: string) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(firstPhysicalLine(cleanText));
  const rows = parseDelimited(cleanText, delimiter);
  const headers = rows[0];

  if (!headers || headers.length === 0) {
    throw new PaymeError(400, "CSV neobsahuje hlavičku.");
  }

  const normalizedHeaders = headers.map(normalizeHeader);

  return rows.slice(1).map<CsvRow>((row, index) => {
    const rawFields: Record<string, string> = {};
    const fields = new Map<string, string>();

    for (let column = 0; column < headers.length; column += 1) {
      const rawHeader = headers[column]?.trim() || `sloupec_${column + 1}`;
      const normalizedHeader = normalizedHeaders[column] || rawHeader;
      const value = row[column]?.trim() ?? "";

      rawFields[rawHeader] = value;
      if (!fields.has(normalizedHeader) || value) {
        fields.set(normalizedHeader, value);
      }
    }

    return {
      rowNumber: index + 2,
      rawFields,
      fields,
    };
  });
}

function readField(row: CsvRow, candidates: string[]) {
  for (const candidate of candidates) {
    const value = row.fields.get(candidate);
    if (value) {
      return value.trim();
    }
  }

  return null;
}

function normalizeVariableSymbol(value: string | null) {
  const normalized = value?.replace(/\s/g, "") ?? "";
  return normalized ? normalized : null;
}

function normalizeCurrency(value: string | null) {
  const normalized = (value ?? "CZK").trim().toUpperCase();
  return normalized || "CZK";
}

function parseAmountMinor(value: string | null) {
  if (!value) {
    return { amountMinor: 0, problemCode: "missing_amount" };
  }

  const compact = value
    .replace(/\u00A0/g, " ")
    .replace(/\s/g, "")
    .replace(/[Kk][čc]|CZK|czk/g, "")
    .replace(/^\+/, "");
  const decimalComma = compact.lastIndexOf(",");
  const decimalDot = compact.lastIndexOf(".");
  const decimalIndex = Math.max(decimalComma, decimalDot);
  const normalized =
    decimalIndex === -1
      ? compact.replace(/[,.]/g, "")
      : `${compact.slice(0, decimalIndex).replace(/[,.]/g, "")}.${compact.slice(
          decimalIndex + 1,
        )}`;
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    return { amountMinor: 0, problemCode: "invalid_amount" };
  }

  return {
    amountMinor: Math.round(amount * 100),
    problemCode: null,
  };
}

function parseBookedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const czech = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(normalized);
  if (czech) {
    return `${czech[3]}-${czech[2].padStart(2, "0")}-${czech[1].padStart(2, "0")}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function extractPaymentCodes(message: string | null) {
  if (!message) {
    return [];
  }

  const matches = message.toUpperCase().match(/\bCP[A-Z0-9]{8}\b/g) ?? [];
  return Array.from(new Set(matches));
}

function normalizeBankRow(row: CsvRow): NormalizedBankRow {
  const amount = parseAmountMinor(readField(row, amountColumns));
  const currency = normalizeCurrency(readField(row, currencyColumns));
  const variableSymbol = normalizeVariableSymbol(
    readField(row, variableSymbolColumns),
  );
  const message = readField(row, messageColumns);
  const paymentCodes = extractPaymentCodes(message);
  const bookedAt = parseBookedAt(readField(row, bookedAtColumns));
  const counterpartyAccount = readField(row, counterpartyAccountColumns);
  const counterpartyName = readField(row, counterpartyNameColumns);
  const transactionId = readField(row, transactionIdColumns);
  const paymentCode = paymentCodes.length === 1 ? paymentCodes[0] ?? null : null;
  const codeProblem =
    paymentCodes.length > 1
      ? "multiple_payment_codes"
      : paymentCodes.length === 0
        ? "missing_payment_code"
        : null;
  const problemCode = amount.problemCode ?? codeProblem;
  const fingerprintSource = transactionId
    ? `bank-id:${transactionId}`
    : [
        bookedAt ?? "",
        amount.amountMinor,
        currency,
        variableSymbol ?? "",
        paymentCode ?? "",
        message ?? "",
        counterpartyAccount ?? "",
        counterpartyName ?? "",
      ].join("|");

  return {
    rowNumber: row.rowNumber,
    rawFields: row.rawFields,
    bookedAt,
    amountMinor: amount.amountMinor,
    currency,
    variableSymbol,
    paymentCode,
    message,
    counterpartyAccount,
    counterpartyName,
    transactionFingerprint: sha256(fingerprintSource),
    problemCode,
  };
}

function emptySummary(input: {
  importId: string;
  fileName: string | null;
  fileSha256: string;
}): BankImportSummary {
  return {
    importId: input.importId,
    fileName: input.fileName,
    fileSha256: input.fileSha256,
    alreadyImported: false,
    rowCount: 0,
    matched: 0,
    duplicates: 0,
    unmatched: 0,
    problem: 0,
    ignored: 0,
    rows: [],
  };
}

function addRowSummary(summary: BankImportSummary, row: BankImportRowSummary) {
  summary.rowCount += 1;
  summary.rows.push(row);

  if (row.status === "matched") {
    summary.matched += 1;
  } else if (row.status === "duplicate") {
    summary.duplicates += 1;
  } else if (row.status === "unmatched") {
    summary.unmatched += 1;
  } else if (row.status === "problem") {
    summary.problem += 1;
  } else {
    summary.ignored += 1;
  }
}

async function updateTransactionStatus(
  client: PoolClient,
  input: {
    id: string;
    status: BankMatchStatus;
    problemCode: string | null;
    matchedSettlementLineId: string | null;
  },
) {
  await client.query(
    `
      update app_bank_transaction
      set match_status = $2,
          problem_code = $3,
          matched_settlement_line_id = $4,
          matched_at = case when $2 = 'matched' then now() else matched_at end,
          updated_at = now()
      where id = $1
    `,
    [
      input.id,
      input.status,
      input.problemCode,
      input.matchedSettlementLineId,
    ],
  );
}

async function matchTransaction(
  client: PoolClient,
  actor: MemberRecord,
  transactionId: string,
  row: NormalizedBankRow,
) {
  if (row.problemCode === "missing_amount" || row.problemCode === "invalid_amount") {
    return {
      status: "problem" as const,
      problemCode: row.problemCode,
      matchedSettlementLineId: null,
    };
  }

  if (row.currency !== "CZK") {
    return {
      status: "ignored" as const,
      problemCode: "unsupported_currency",
      matchedSettlementLineId: null,
    };
  }

  if (row.amountMinor <= 0) {
    return {
      status: "ignored" as const,
      problemCode: "non_positive_amount",
      matchedSettlementLineId: null,
    };
  }

  if (row.variableSymbol !== env.PAYME_BANK_VARIABLE_SYMBOL) {
    return {
      status: "ignored" as const,
      problemCode: "wrong_variable_symbol",
      matchedSettlementLineId: null,
    };
  }

  if (row.problemCode === "multiple_payment_codes") {
    return {
      status: "problem" as const,
      problemCode: row.problemCode,
      matchedSettlementLineId: null,
    };
  }

  if (!row.paymentCode) {
    return {
      status: "unmatched" as const,
      problemCode: "missing_payment_code",
      matchedSettlementLineId: null,
    };
  }

  const settlement = firstRow(
    await client.query<SettlementMatchRow>(
      `
        select
          id,
          status,
          amount_minor,
          coalesce(variable_symbol, $2) as variable_symbol
        from app_settlement_line
        where payment_code = $1
        limit 1
        for update
      `,
      [row.paymentCode, env.PAYME_BANK_VARIABLE_SYMBOL],
    ),
  );

  if (!settlement) {
    return {
      status: "unmatched" as const,
      problemCode: "unknown_payment_code",
      matchedSettlementLineId: null,
    };
  }

  if (settlement.variable_symbol !== row.variableSymbol) {
    return {
      status: "problem" as const,
      problemCode: "settlement_variable_symbol_mismatch",
      matchedSettlementLineId: settlement.id,
    };
  }

  if (settlement.amount_minor !== row.amountMinor) {
    return {
      status: "problem" as const,
      problemCode: "amount_mismatch",
      matchedSettlementLineId: settlement.id,
    };
  }

  if (settlement.status !== "open") {
    return {
      status: "problem" as const,
      problemCode: "already_paid",
      matchedSettlementLineId: settlement.id,
    };
  }

  const paidAt = row.bookedAt ? `${row.bookedAt} 12:00:00+00` : null;
  const marked = await client.query<{ id: string }>(
    `
      update app_settlement_line
      set status = 'paid',
          paid_marked_at = coalesce($2::timestamptz, now()),
          paid_by_member_id = $3,
          paid_source = 'bank_csv',
          paid_note = $4
      where id = $1
        and status = 'open'
      returning id
    `,
    [
      settlement.id,
      paidAt,
      actor.id,
      `CSV import: ${transactionId}`,
    ],
  );

  if (marked.rowCount === 0) {
    return {
      status: "problem" as const,
      problemCode: "already_paid",
      matchedSettlementLineId: settlement.id,
    };
  }

  return {
    status: "matched" as const,
    problemCode: null,
    matchedSettlementLineId: settlement.id,
  };
}

async function insertBankTransaction(
  client: PoolClient,
  input: {
    importId: string;
    row: NormalizedBankRow;
  },
) {
  const existing = firstRow(
    await client.query<ExistingBankTransactionRow>(
      `
        select id, match_status, problem_code, matched_settlement_line_id
        from app_bank_transaction
        where transaction_fingerprint = $1
        limit 1
        for update
      `,
      [input.row.transactionFingerprint],
    ),
  );

  if (existing) {
    await client.query(
      `
        update app_bank_transaction
        set last_import_id = $2,
            last_row_number = $3,
            seen_count = seen_count + 1,
            updated_at = now()
        where id = $1
      `,
      [existing.id, input.importId, input.row.rowNumber],
    );

    return {
      inserted: false,
      id: existing.id,
      status: existing.match_status,
      problemCode: existing.problem_code,
      matchedSettlementLineId: existing.matched_settlement_line_id,
    };
  }

  const transactionId = createId("banktx");

  await client.query(
    `
      insert into app_bank_transaction (
        id,
        first_import_id,
        last_import_id,
        first_row_number,
        last_row_number,
        transaction_fingerprint,
        booked_at,
        amount_minor,
        currency,
        variable_symbol,
        payment_code,
        message,
        counterparty_account,
        counterparty_name,
        raw_fields,
        match_status,
        problem_code
      ) values (
        $1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        'problem', null
      )
    `,
    [
      transactionId,
      input.importId,
      input.row.rowNumber,
      input.row.transactionFingerprint,
      input.row.bookedAt,
      input.row.amountMinor,
      input.row.currency,
      input.row.variableSymbol,
      input.row.paymentCode,
      input.row.message,
      input.row.counterpartyAccount,
      input.row.counterpartyName,
      input.row.rawFields,
    ],
  );

  return {
    inserted: true,
    id: transactionId,
    status: "problem" as const,
    problemCode: null,
    matchedSettlementLineId: null,
  };
}

async function processBankRow(
  client: PoolClient,
  actor: MemberRecord,
  importId: string,
  row: NormalizedBankRow,
): Promise<BankImportRowSummary> {
  const transaction = await insertBankTransaction(client, {
    importId,
    row,
  });

  if (!transaction.inserted) {
    return {
      rowNumber: row.rowNumber,
      status: "duplicate",
      problemCode: transaction.problemCode,
      amountMinor: row.amountMinor,
      currency: row.currency,
      variableSymbol: row.variableSymbol,
      paymentCode: row.paymentCode,
      message: row.message,
      matchedSettlementLineId: transaction.matchedSettlementLineId,
    };
  }

  const result = await matchTransaction(client, actor, transaction.id, row);
  await updateTransactionStatus(client, {
    id: transaction.id,
    status: result.status,
    problemCode: result.problemCode,
    matchedSettlementLineId: result.matchedSettlementLineId,
  });

  return {
    rowNumber: row.rowNumber,
    status: result.status,
    problemCode: result.problemCode,
    amountMinor: row.amountMinor,
    currency: row.currency,
    variableSymbol: row.variableSymbol,
    paymentCode: row.paymentCode,
    message: row.message,
    matchedSettlementLineId: result.matchedSettlementLineId,
  };
}

export async function importBankCsv(
  actor: MemberRecord,
  input: {
    fileName?: string | null;
    csvText: string;
    accountMemberId?: string | null;
  },
) {
  const fileName = input.fileName?.trim() || null;
  const fileSha256 = sha256(input.csvText);
  const existingImport = firstRow(
    await pool.query<ExistingImportRow>(
      `
        select id, file_name, file_sha256, row_count, summary
        from app_bank_csv_import
        where file_sha256 = $1
        limit 1
      `,
      [fileSha256],
    ),
  );

  if (existingImport) {
    return {
      ...existingImport.summary,
      alreadyImported: true,
    };
  }

  const csvRows = parseCsv(input.csvText);
  const normalizedRows = csvRows.map(normalizeBankRow);
  const importId = createId("bankimport");

  return withTransaction(async (client) => {
    const summary = emptySummary({
      importId,
      fileName,
      fileSha256,
    });

    await client.query(
      `
        insert into app_bank_csv_import (
          id,
          uploaded_by_member_id,
          account_member_id,
          file_name,
          file_sha256,
          row_count,
          status
        ) values ($1, $2, $3, $4, $5, $6, 'imported')
      `,
      [
        importId,
        actor.id,
        input.accountMemberId?.trim() || null,
        fileName,
        fileSha256,
        normalizedRows.length,
      ],
    );

    for (const row of normalizedRows) {
      addRowSummary(summary, await processBankRow(client, actor, importId, row));
    }

    await client.query(
      `
        update app_bank_csv_import
        set row_count = $2,
            summary = $3
        where id = $1
      `,
      [importId, summary.rowCount, summary],
    );

    return summary;
  });
}
