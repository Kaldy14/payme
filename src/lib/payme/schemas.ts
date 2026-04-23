import { z } from "zod";

const roleSchema = z.enum(["admin", "member"]);

export const createInviteSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().min(1).max(120),
  role: roleSchema.default("member"),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unitLabel: z.string().trim().max(60).optional(),
});

export const createShelfSchema = z.object({
  productId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(240).optional(),
});

export const createTagSchema = z.object({
  shelfId: z.string().trim().min(1),
});

export const payoutAccountSchema = z.object({
  accountPrefix: z.string().trim().max(10).optional(),
  accountNumber: z.string().trim().min(1).max(17),
  bankCode: z.string().trim().regex(/^\d{4}$/),
  accountName: z.string().trim().max(120).optional(),
  iban: z.string().trim().max(34).optional(),
});

export const createBatchSchema = z.object({
  shelfId: z.string().trim().min(1),
  buyerMemberId: z.string().trim().min(1).optional(),
  quantityTotal: z.int().positive(),
  purchaseTotalMinor: z.int().positive(),
  unitPriceMinor: z.int().positive().optional(),
  receiptNote: z.string().trim().max(240).optional(),
});

export const activateBatchSchema = z.object({
  batchId: z.string().trim().min(1),
});

export const createTakeSchema = z.object({
  tagToken: z.string().trim().min(20),
  units: z.int().positive().max(9).default(1),
  source: z.enum(["nfc", "manual"]).default("nfc"),
  idempotencyKey: z.string().trim().min(12).max(120),
  occurredAt: z.iso.datetime().optional(),
});

export const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/);
