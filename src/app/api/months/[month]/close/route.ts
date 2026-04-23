import { requireAdmin, requireMember } from "@/lib/payme/authz";
import { closeMonth } from "@/lib/payme/commands";
import { jsonError, jsonOk } from "@/lib/payme/http";
import { monthKeySchema } from "@/lib/payme/schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    month: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { member } = await requireMember(request);
    requireAdmin(member);

    const { month } = await context.params;
    return jsonOk(await closeMonth(member, monthKeySchema.parse(month)));
  } catch (error) {
    return jsonError(error);
  }
}
