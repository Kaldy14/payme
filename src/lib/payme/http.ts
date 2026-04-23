import { ZodError, type ZodType } from "zod";

import { PaymeError } from "@/lib/payme/errors";

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const body = await request.json().catch(() => {
    throw new PaymeError(400, "Invalid JSON body.");
  });

  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new PaymeError(400, "Request validation failed.", error.flatten());
    }

    throw error;
  }
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function jsonError(error: unknown) {
  if (error instanceof PaymeError) {
    return Response.json(
      {
        error: error.message,
        details: error.details ?? null,
      },
      {
        status: error.status,
      },
    );
  }

  console.error(error);

  return Response.json(
    {
      error: "Internal server error.",
    },
    {
      status: 500,
    },
  );
}
