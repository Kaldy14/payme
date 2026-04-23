import type { PoolClient } from "pg";

import { auth } from "@/lib/auth";
import { firstRow, pool } from "@/lib/db/pool";
import { PaymeError } from "@/lib/payme/errors";

export type MemberRole = "admin" | "member";

export type MemberRecord = {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role: MemberRole;
  created_at: Date;
  updated_at: Date;
};

export async function findMemberByAuthUserId(
  authUserId: string,
  client: PoolClient | typeof pool = pool,
) {
  return firstRow(
    await client.query<MemberRecord>(
      `
        select *
        from app_member
        where auth_user_id = $1
        limit 1
      `,
      [authUserId],
    ),
  );
}

export async function requireMember(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new PaymeError(401, "Nejdřív se přihlas.");
  }

  const member = await findMemberByAuthUserId(session.user.id);

  if (!member) {
    throw new PaymeError(403, "K tomuto účtu není připojen člen PayMe.");
  }

  return {
    session,
    member,
  };
}

export function requireAdmin(member: MemberRecord) {
  if (member.role !== "admin") {
    throw new PaymeError(403, "Jen pro adminy.");
  }
}
