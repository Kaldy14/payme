import { requireMember } from "@/lib/payme/authz";
import { createTake } from "@/lib/payme/commands";
import { assertSameOriginRequest, jsonError, jsonOk, parseJsonBody } from "@/lib/payme/http";
import { createTakeSchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const { member } = await requireMember(request);
    const input = await parseJsonBody(request, createTakeSchema);

    return jsonOk(await createTake(member, input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
