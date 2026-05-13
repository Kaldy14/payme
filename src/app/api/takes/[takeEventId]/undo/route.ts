import { requireMember } from "@/lib/payme/authz";
import { undoTake } from "@/lib/payme/commands";
import { assertSameOriginRequest, jsonError, jsonOk } from "@/lib/payme/http";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    takeEventId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const { member } = await requireMember(request);
    const { takeEventId } = await context.params;

    return jsonOk(await undoTake(member, takeEventId));
  } catch (error) {
    return jsonError(error);
  }
}
