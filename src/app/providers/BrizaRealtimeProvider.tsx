
"use client";

import type { ReactNode } from "react";
import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { RealtimeProvider } from "./RealtimeProvider";

export function BrizaRealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { currentUser } = useCurrentUser();

  return (
    <RealtimeProvider
      userId={currentUser?._id ?? null}
    >
      {children}
    </RealtimeProvider>
  );
}
