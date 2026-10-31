
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import type { Channel } from "pusher-js";
import type { CommentWithAuthor } from "@/types/comment";
import { pusherClient } from "@/backend/lib/pusher-client";
import { NotificationType } from "@/types/notification";

type RealtimeEvents = {
  "new-notification": {
    notification:NotificationType
  };

  "new-message": unknown;

  "new-comment": {
    comment: CommentWithAuthor;
  };

  "new-reply": {
    reply: CommentWithAuthor;
  };

  "new-post": unknown;
};

type EventName = keyof RealtimeEvents;

export type EventHandler<E extends EventName> = (
  payload: RealtimeEvents[E]
) => void;

type Listener = (payload: unknown) => void;

type RealtimeContextValue = {
  subscribe: <E extends EventName>(
    eventName: E,
    handler: EventHandler<E>
  ) => () => void;

  subscribeToPost: <E extends "new-comment" | "new-reply">(
    postId: string,
    eventName: E,
    handler: EventHandler<E>
  ) => () => void;
};

const RealtimeContext =
  createContext<RealtimeContextValue | null>(null);

const EVENT_NAMES: EventName[] = [
  "new-notification",
  "new-message",
  "new-comment",
  "new-reply",
  "new-post",
];

type Props = {
  userId: string | null | undefined;
  children: ReactNode;
};

export function RealtimeProvider({
  userId,
  children,
}: Props) {
  // One channel instance per channel name.
  const channelsRef = useRef<Map<string, Channel>>(new Map());

  // Listeners are isolated by channel AND event.
  const listenersRef = useRef<
    Map<string, Map<EventName, Set<Listener>>>
  >(new Map());

  const ensureChannel = useCallback((channelName: string) => {
    const existing = channelsRef.current.get(channelName);

    if (existing) return existing;

    const channel = pusherClient.subscribe(channelName);
    channelsRef.current.set(channelName, channel);

    // Bind each Pusher event once for this channel.
    for (const eventName of EVENT_NAMES) {
      channel.bind(eventName, (payload: unknown) => {
        const listeners = listenersRef.current
          .get(channelName)
          ?.get(eventName);

        listeners?.forEach((handler) => handler(payload));
      });
    }

    return channel;
  }, []);

  const releaseChannelIfUnused = useCallback(
    (channelName: string) => {
      const channelListeners =
        listenersRef.current.get(channelName);

      const hasListeners =
        channelListeners &&
        Array.from(channelListeners.values()).some(
          (listeners) => listeners.size > 0
        );

      if (hasListeners) return;

      const channel = channelsRef.current.get(channelName);

      if (!channel) return;

      for (const eventName of EVENT_NAMES) {
        channel.unbind(eventName);
      }

      pusherClient.unsubscribe(channelName);

      channelsRef.current.delete(channelName);
      listenersRef.current.delete(channelName);
    },
    []
  );

  const subscribeToChannel = useCallback(
    <E extends EventName,>(
      channelName: string,
      eventName: E,
      handler: EventHandler<E>
    ) => {
      ensureChannel(channelName);

      let channelListeners =
        listenersRef.current.get(channelName);

      if (!channelListeners) {
        channelListeners = new Map();
        listenersRef.current.set(
          channelName,
          channelListeners
        );
      }

      let eventListeners = channelListeners.get(eventName);

      if (!eventListeners) {
        eventListeners = new Set();
        channelListeners.set(eventName, eventListeners);
      }

      const listener: Listener = (payload) => {
        handler(payload as RealtimeEvents[E]);
      };

      eventListeners.add(listener);

      // Remove only this subscriber's handler.
      return () => {
        eventListeners?.delete(listener);
        releaseChannelIfUnused(channelName);
      };
    },
    [ensureChannel, releaseChannelIfUnused]
  );

  // Existing API: listen on the authenticated user's channel.
  const subscribe = useCallback(
    <E extends EventName,>(
      eventName: E,
      handler: EventHandler<E>
    ) => {
      if (!userId) return () => {};

      return subscribeToChannel(
        `private-user-${userId}`,
        eventName,
        handler
      );
    },
    [userId, subscribeToChannel]
  );

  // New API: listen on one particular post's channel.
  const subscribeToPost = useCallback(
    <E extends "new-comment" | "new-reply",>(
      postId: string,
      eventName: E,
      handler: EventHandler<E>
    ) => {
      if (!userId || !postId) return () => {};

      return subscribeToChannel(
        `private-post-${postId}`,
        eventName,
        handler
      );
    },
    [userId, subscribeToChannel]
  );

  // Release any remaining channels when the provider unmounts.
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const [channelName, channel] of channelsRef.current) {
        for (const eventName of EVENT_NAMES) {
          channel.unbind(eventName);
        }

        pusherClient.unsubscribe(channelName);
      }

      channelsRef.current.clear();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      listenersRef.current.clear();
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{ subscribe, subscribeToPost }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error(
      "useRealtime must be used inside RealtimeProvider"
    );
  }

  return context;
}
