"use client";

import { type ReactNode } from "react";
import { SyncProvider } from "./sync-provider";
import { InstallPrompt } from "./install-prompt";

export function DashboardPwaWrapper({ children }: { children: ReactNode }) {
  return (
    <SyncProvider>
      {children}
      <InstallPrompt />
    </SyncProvider>
  );
}
