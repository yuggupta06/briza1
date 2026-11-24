
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
import type { MessagingMessage } from "@/types/messaging-ui";
import { pusherClient } from "@/backend/lib/pusher-client";
import { NotificationType } from "@/types/notification";

type MessageEventPayload = {
  conversationId: string;
  message: MessagingMessage;
   unreadCount?: number;
};

type MessagesReadPayload = {
  conversationId: string;
  readerId: string;
  lastReadMessageId: string | null;
  lastReadSeq: number;
};

type RealtimeEvents = {
  // User channel events
  "new-notification": {
    notification: NotificationType;
  };

  "new-message-notification": MessageEventPayload;

  "messages-read-notification": MessagesReadPayload;

  "new-comment": {
    comment: CommentWithAuthor;
  };

  "new-reply": {
    reply: CommentWithAuthor;
  };

  "new-post": unknown;

  // Conversation channel events
  "new-message": MessageEventPayload;

  "messages-read": MessagesReadPayload;
};

type EventName = keyof RealtimeEvents;

type UserEventName =
  | "new-notification"
  | "new-message-notification"
  | "messages-read-notification"
  | "new-comment"
  | "new-reply"
  | "new-post";

type PostEventName = "new-comment" | "new-reply";

type ConversationEventName = "new-message" | "messages-read";

export type EventHandler<E extends EventName> = (
  payload: RealtimeEvents[E]
) => void;

type Listener = (payload: unknown) => void;

type RealtimeContextValue = {
  subscribe: <E extends UserEventName>(
    eventName: E,
    handler: EventHandler<E>
  ) => () => void;

  subscribeToPost: <E extends PostEventName>(
    postId: string,
    eventName: E,
    handler: EventHandler<E>
  ) => () => void;

  subscribeToConversation: <E extends ConversationEventName>(
    conversationId: string,
    eventName: E,
    handler: EventHandler<E>
  ) => () => void;
};

const RealtimeContext =
  createContext<RealtimeContextValue | null>(null);

const EVENT_NAMES: EventName[] = [
  "new-notification",
  "new-message-notification",
  "messages-read-notification",
  "new-comment",
  "new-reply",
  "new-post",
  "new-message",
  "messages-read",
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

  // Listen on the authenticated user's private channel.
  const subscribe = useCallback(
    <E extends UserEventName,>(
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

  // Listen on one particular post's private channel.
  const subscribeToPost = useCallback(
    <E extends PostEventName,>(
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

  // Listen on one particular conversation's private channel.
  const subscribeToConversation = useCallback(
    <E extends ConversationEventName,>(
      conversationId: string,
      eventName: E,
      handler: EventHandler<E>
    ) => {
      if (!userId || !conversationId) return () => {};

      return subscribeToChannel(
        `private-conversation-${conversationId}`,
        eventName,
        handler
      );
    },
    [userId, subscribeToChannel]
  );

  // Release remaining channels when the provider unmounts.
  useEffect(() => {
  const channels = channelsRef.current;
  const listeners = listenersRef.current;

  return () => {
    for (const [channelName, channel] of channels) {
      for (const eventName of EVENT_NAMES) {
        channel.unbind(eventName);
      }

      pusherClient.unsubscribe(channelName);
    }

    channels.clear();
    listeners.clear();
  };
}, []);

  return (
    <RealtimeContext.Provider
      value={{
        subscribe,
        subscribeToPost,
        subscribeToConversation,
      }}
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
