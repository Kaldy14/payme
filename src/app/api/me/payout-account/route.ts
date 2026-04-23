import { requireMember } from "@/lib/payme/authz";
import { upsertPayoutAccount } from "@/lib/payme/commands";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/payme/http";
import { payoutAccountSchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { member } = await requireMember(request);
    const input = await parseJsonBody(request, payoutAccountSchema);

    return jsonOk(await upsertPayoutAccount(member.id, input));
  } catch (error) {
    return jsonError(error);
  }
}
