import { requireMember } from "@/lib/payme/authz";
import { jsonError, jsonOk } from "@/lib/payme/http";
import { getMonthlyReport } from "@/lib/payme/queries";
import { monthKeySchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    month: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { member } = await requireMember(request);
    const { month } = await context.params;

    return jsonOk(await getMonthlyReport(member.id, monthKeySchema.parse(month)));
  } catch (error) {
    return jsonError(error);
  }
}
