"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";

import { WalletConnect } from "@/components/wallet-connect";

const NAV_LINKS = [
  { href: "/", label: "HumanPass" },
  { href: "/verify", label: "Verify" },
  { href: "/status", label: "Status" },
  { href: "/humans", label: "Humans" },
  { href: "/vote", label: "Vote" },
];

export function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface-primary/90 px-4 py-3 backdrop-blur-xl sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4" aria-label="Global navigation">
        <Link
          href="/"
          className="glow-text text-lg font-black tracking-tight"
          onClick={() => setIsOpen(false)}
        >
          HumanPass
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-monad-purple/15 text-monad-purple-light"
                    : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <WalletConnect />
        </div>

        <button
          type="button"
          className="btn-secondary lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="sr-only">Open navigation menu</span>
          <span aria-hidden="true">{isOpen ? "✕" : "☰"}</span>
        </button>
      </nav>

      {isOpen && (
        <div id="mobile-nav" className="mx-auto mt-3 max-w-6xl lg:hidden">
          <div className="card-base bg-card-shine flex flex-col gap-3 p-4">
            <div className="grid gap-2">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={clsx(
                      "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-monad-purple/15 text-monad-purple-light"
                        : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-surface-border pt-3">
              <WalletConnect />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
