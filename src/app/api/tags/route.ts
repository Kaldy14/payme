import { requireAdmin, requireMember } from "@/lib/payme/authz";
import { createTag } from "@/lib/payme/commands";
import { assertSameOriginRequest, jsonError, jsonOk, parseJsonBody } from "@/lib/payme/http";
import { createTagSchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const { member } = await requireMember(request);
    requireAdmin(member);

    const input = await parseJsonBody(request, createTagSchema);
    return jsonOk(await createTag(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
