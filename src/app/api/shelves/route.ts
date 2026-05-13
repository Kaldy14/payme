import { requireAdmin, requireMember } from "@/lib/payme/authz";
import { createShelf } from "@/lib/payme/commands";
import { assertSameOriginRequest, jsonError, jsonOk, parseJsonBody } from "@/lib/payme/http";
import { createShelfSchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const { member } = await requireMember(request);
    requireAdmin(member);

    const input = await parseJsonBody(request, createShelfSchema);
    return jsonOk(await createShelf(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
