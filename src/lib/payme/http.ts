import { ZodError, type ZodType } from "zod";

import { env } from "@/lib/env";
import { PaymeError } from "@/lib/payme/errors";

function normalizeOrigin(value: string | null) {
  if (!value || value === "null") return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function headerOrigin(headers: Headers) {
  const origin = normalizeOrigin(headers.get("origin"));
  if (origin) return origin;

  return normalizeOrigin(headers.get("referer"));
}

function configuredOrigins() {
  return new Set(
    [env.BETTER_AUTH_URL, env.PAYME_BASE_URL].map((value) => new URL(value).origin),
  );
}

function assertOriginAllowed(origin: string | null, requestOrigin?: string) {
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      throw new PaymeError(403, "Požadavek nejde ověřit.");
    }
    return;
  }

  const allowedOrigins = configuredOrigins();
  if (requestOrigin) allowedOrigins.add(requestOrigin);

  if (!allowedOrigins.has(origin)) {
    throw new PaymeError(403, "Požadavek nejde ověřit.");
  }
}

export function assertSameOriginRequest(request: Request) {
  assertOriginAllowed(headerOrigin(request.headers), new URL(request.url).origin);
}

export function assertSameOriginHeaders(headers: Headers) {
  assertOriginAllowed(headerOrigin(headers));
}

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
