import { requireAdmin, requireMember } from "@/lib/payme/authz";
import { createInvite } from "@/lib/payme/commands";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/payme/http";
import { createInviteSchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { member } = await requireMember(request);
    requireAdmin(member);

    const input = await parseJsonBody(request, createInviteSchema);
    return jsonOk(await createInvite(member, input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
