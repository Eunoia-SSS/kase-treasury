"use client";

import type { ReactNode } from "react";
import { SolanaAppProvider } from "@/chain/provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <SolanaAppProvider>{children}</SolanaAppProvider>;
}
