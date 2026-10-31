
"use client";

import { useEffect, useRef } from "react";
import {
  useRealtime,
  type EventHandler,
} from "@/app/providers/RealtimeProvider";

type EventName =
  | "new-notification"
  | "new-message"
  | "new-comment"
  | "new-post";

export function useRealtimeEvent<E extends EventName>(
  eventName: E,
  handler: EventHandler<E>
) {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return subscribe(eventName, ((payload) => {
      handlerRef.current(payload);
    }) as EventHandler<E>);
  }, [subscribe, eventName]);
}
