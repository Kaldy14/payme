import { requireMember } from "@/lib/payme/authz";
import { markSettlementPaid } from "@/lib/payme/commands";
import { jsonError, jsonOk } from "@/lib/payme/http";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    settlementId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { member } = await requireMember(request);
    const { settlementId } = await context.params;

    return jsonOk(await markSettlementPaid(member, settlementId));
  } catch (error) {
    return jsonError(error);
  }
}
