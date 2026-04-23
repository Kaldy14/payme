import { requireMember } from "@/lib/payme/authz";
import { createBatch } from "@/lib/payme/commands";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/payme/http";
import { createBatchSchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { member } = await requireMember(request);
    const input = await parseJsonBody(request, createBatchSchema);
    return jsonOk(await createBatch(member, input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
