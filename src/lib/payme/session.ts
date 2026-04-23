import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { findMemberByAuthUserId, type MemberRecord } from "@/lib/payme/authz";

export type SessionMember = {
  memberId: string;
  email: string;
  displayName: string;
  role: "admin" | "member";
  authUserId: string;
};

export const getSessionMember = cache(async (): Promise<SessionMember | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const member: MemberRecord | null = await findMemberByAuthUserId(session.user.id);
  if (!member) return null;

  return {
    memberId: member.id,
    email: member.email,
    displayName: member.display_name,
    role: member.role,
    authUserId: session.user.id,
  };
});
