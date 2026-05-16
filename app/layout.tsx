import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Nav } from "@/components/nav";
import { getConfig } from "@/lib/wagmi/config";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "HumanPass",
  description: "Proof-of-human session layer for consumer apps on Monad",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialState = cookieToInitialState(
    getConfig(),
    (await headers()).get("cookie") ?? undefined
  );

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <Providers initialState={initialState}>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
