import { requireAdmin, requireMember } from "@/lib/payme/authz";
import { activateBatch } from "@/lib/payme/commands";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/payme/http";
import { activateBatchSchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    shelfId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { member } = await requireMember(request);
    requireAdmin(member);

    const { shelfId } = await context.params;
    const body = await parseJsonBody(request, activateBatchSchema);

    return jsonOk(
      await activateBatch({
        shelfId,
        batchId: body.batchId,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}
