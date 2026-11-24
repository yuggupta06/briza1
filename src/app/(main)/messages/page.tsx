
import { Suspense } from "react";

import MessagesPage from "@/app/components/Messaging/MessagesPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-64px)] items-center justify-center bg-surface text-on-surface-variant">
          Loading messages...
        </div>
      }
    >
      <MessagesPage />
    </Suspense>
  );
}
