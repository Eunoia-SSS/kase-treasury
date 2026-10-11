import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/shell";
import { AppProviders } from "@/components/dashboard/providers";

export const metadata: Metadata = {
  title: "KASE Treasury | Bond Operations",
  description: "Independent educational prototype for tokenized bond lifecycle operations on Solana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders><DashboardShell>{children}</DashboardShell></AppProviders>
      </body>
    </html>
  );
}

