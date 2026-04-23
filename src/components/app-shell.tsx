import Link from "next/link";

import { signOutAction } from "@/lib/actions";
import type { SessionMember } from "@/lib/payme/session";

export function Masthead({ member }: { member: SessionMember | null }) {
  return (
    <header className="border-b border-ink bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-5 pt-6 pb-3 sm:px-8">
        <Link
          href={member ? "/" : "/sign-in"}
          className="group flex items-baseline gap-3"
        >
          <span className="display text-[2.1rem] leading-none tracking-tight">
            Pay<span className="display-italic text-ember">Me</span>
            <span className="text-ink">.</span>
          </span>
          <span className="eyebrow hidden sm:inline text-ink-faint">
            pro parťáky z kanceláře
          </span>
        </Link>

        {member ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="eyebrow text-ink-faint">přihlášen/a</div>
              <div className="tabular text-[0.82rem]">{member.displayName}</div>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                odhlásit
              </button>
            </form>
          </div>
        ) : (
          <Link href="/sign-in" className="btn btn-sm">
            přihlásit
          </Link>
        )}
      </div>

      {member && (
        <nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-5 pb-3 text-[0.72rem] sm:px-8">
          <NavLink href="/">doma</NavLink>
          <NavLink href="/shelves">nákup</NavLink>
          <NavLink href="/account">účet</NavLink>
          {member.role === "admin" && <NavLink href="/admin">kuchyň</NavLink>}
        </nav>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-none border border-transparent px-3 py-1.5 font-mono uppercase tracking-[0.2em] text-ink-soft transition hover:border-ink hover:text-ink"
    >
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="mt-14 border-t border-rule bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-6 text-[0.72rem] uppercase tracking-[0.22em] text-ink-faint sm:flex-row sm:items-baseline sm:justify-between sm:px-8 tabular">
        <span>PayMe · pro parťáky z kanceláře</span>
        <span>CZ</span>
      </div>
    </footer>
  );
}

export function PageFrame({
  member,
  children,
}: {
  member: SessionMember | null;
  children: React.ReactNode;
}) {
  return (
    <>
      <Masthead member={member} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
