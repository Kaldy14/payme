import { requireMember } from "@/lib/payme/authz";
import { jsonError, jsonOk } from "@/lib/payme/http";
import { getTagSummary } from "@/lib/payme/queries";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tagToken: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireMember(request);
    const { tagToken } = await context.params;
    const summary = await getTagSummary(tagToken);

    if (!summary) {
      return Response.json(
        {
          error: "Tag not found.",
        },
        {
          status: 404,
        },
      );
    }

    return jsonOk(summary);
  } catch (error) {
    return jsonError(error);
  }
}
