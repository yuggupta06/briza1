
"use client";

import axios from "axios";
import { MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useConversations } from "@/app/hooks/messaging/useConversations";
import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { useRealtime } from "@/app/providers/RealtimeProvider";

import ChatWindow from "./ChatWindow";
import ConversationList from "./ConversationList";

import type {
  ConversationInboxItem,
  MessagingMessage,
} from "@/types/messaging-ui";




interface DirectConversationResponse {
  success: boolean;
  conversation: {
    _id: string;
    otherParticipant: ConversationInboxItem["otherParticipant"];
    lastMessage: MessagingMessage | null;
    lastMessageAt: string | null;
    lastMessageSeq: number;
    unreadCount: number;
    lastReadSeq: number;
    otherParticipantLastReadSeq: number;
  };
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { currentUser } = useCurrentUser();
  const { subscribe } = useRealtime();

  const {
    conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    mutate,
  } = useConversations();

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  // Holds a conversation fetched directly by its ID
  // when it isn't available in the inbox cache.
  const [directConversation, setDirectConversation] =
    useState<ConversationInboxItem | null>(null);

  const [isLoadingDirectConversation, setIsLoadingDirectConversation] =
    useState(false);

  const [directConversationError, setDirectConversationError] =
    useState(false);

  // Read the selected conversation ID from the URL.
  useEffect(() => {
    const conversationId = searchParams.get("conversationId");

    setSelectedConversationId(conversationId);
  }, [searchParams]);

  // Find the selected conversation in the cached inbox.
  const cachedConversation = conversations.find(
    (conversation) =>
      conversation._id === selectedConversationId
  );

  // If the selected conversation isn't cached, fetch its metadata.
  useEffect(() => {
    if (!selectedConversationId) {
      setDirectConversation(null);
      setDirectConversationError(false);
      return;
    }

    // The conversation is already available in the inbox.
    if (cachedConversation) {
      setDirectConversation(null);
      setDirectConversationError(false);
      return;
    }

    let cancelled = false;

    const fetchDirectConversation = async () => {
      setIsLoadingDirectConversation(true);
      setDirectConversationError(false);

      try {
        const { data } =
          await axios.get<DirectConversationResponse>(
            `/api/conversations/${selectedConversationId}`,
            { withCredentials: true }
          );

        if (cancelled || !data.success) return;

        const fetchedConversation: ConversationInboxItem = {
          _id: data.conversation._id,
          otherParticipant: data.conversation.otherParticipant,
          lastMessage: data.conversation.lastMessage,
          lastMessageAt: data.conversation.lastMessageAt,
          unreadCount: data.conversation.unreadCount,
          lastReadSeq: data.conversation.lastReadSeq,
          otherParticipantLastReadSeq:
            data.conversation.otherParticipantLastReadSeq,
        };

        setDirectConversation(fetchedConversation);

        // If the inbox cache exists, insert the conversation
        // into its first page so the sidebar also displays it.
        await mutate(
          (pages) => {
            if (!pages) return pages;

            const alreadyExists = pages.some((page) =>
              page.conversations.some(
                (conversation) =>
                  conversation._id === fetchedConversation._id
              )
            );

            if (alreadyExists) return pages;

            return pages.map((page, index) =>
              index === 0
                ? {
                  ...page,
                  conversations: [
                    fetchedConversation,
                    ...page.conversations,
                  ],
                }
                : page
            );
          },
          { revalidate: false }
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to fetch selected conversation:",
            error
          );
          setDirectConversationError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDirectConversation(false);
        }
      }
    };

    void fetchDirectConversation();

    return () => {
      cancelled = true;
    };
  }, [
    selectedConversationId,
    cachedConversation,
    mutate,
  ]);

  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    const updateViewport = () => {
      setViewportHeight(
        visualViewport?.height ?? window.innerHeight
      );
    };

    updateViewport();

    visualViewport?.addEventListener("resize", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      visualViewport?.removeEventListener("resize", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  // Combine cached conversations with the directly fetched one.
  // This also works when the inbox cache hasn't loaded yet.
  const conversationsWithDirect = directConversation
    ? [
      directConversation,
      ...conversations.filter(
        (conversation) =>
          conversation._id !== directConversation._id
      ),
    ]
    : conversations;

  const selectedConversation =
    conversationsWithDirect.find(
      (conversation) =>
        conversation._id === selectedConversationId
    ) ?? null;

  // Update the inbox when a message is sent.
  const handleMessageSent = useCallback(
    async (
      conversationId: string,
      message: MessagingMessage
    ) => {
      setDirectConversation((previous) =>
        previous?._id === conversationId
          ? {
            ...previous,
            lastMessage: message,
            lastMessageAt: message.createdAt,
          }
          : previous
      );

      await mutate(
        (pages) => {
          if (!pages) return pages;

          const existingConversation = pages
            .flatMap((page) => page.conversations)
            .find(
              (conversation) =>
                conversation._id === conversationId
            );

          if (!existingConversation) return pages;

          const updatedConversation: ConversationInboxItem = {
            ...existingConversation,
            lastMessage: message,
            lastMessageAt: message.createdAt,
          };

          const updatedPages = pages.map((page) => ({
            ...page,
            conversations: page.conversations.filter(
              (conversation) =>
                conversation._id !== conversationId
            ),
          }));

          if (updatedPages[0]) {
            updatedPages[0].conversations = [
              updatedConversation,
              ...updatedPages[0].conversations,
            ];
          }

          return updatedPages;
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  // Update the unread count after a conversation is read.
  const handleUnreadCountChange = useCallback(
    async (
      conversationId: string,
      unreadCount: number,
      lastReadSeq: number
    ) => {
      setDirectConversation((previous) =>
        previous?._id === conversationId
          ? {
            ...previous,
            unreadCount,
            lastReadSeq,
          }
          : previous
      );

      await mutate(
        (pages) => {
          if (!pages) return pages;

          return pages.map((page) => ({
            ...page,
            conversations: page.conversations.map(
              (conversation) =>
                conversation._id === conversationId
                  ? {
                    ...conversation,
                    unreadCount,
                    lastReadSeq,
                  }
                  : conversation
            ),
          }));
        },
        { revalidate: false }
      );
    },
    [mutate]
  );
  // Handle messages received through the user's private Pusher channel.
  const handleIncomingMessage = useCallback(
    async (payload: {
      conversationId: string;
      message: MessagingMessage;
      unreadCount?: number;
    }) => {
      const { conversationId, message, unreadCount } = payload;

      // Update the directly fetched conversation if it matches.
      setDirectConversation((previous) => {
        if (previous?._id !== conversationId) return previous;

        return {
          ...previous,
          lastMessage: message,
          lastMessageAt: message.createdAt,
          unreadCount: unreadCount ?? previous.unreadCount + 1,
        };
      });

      await mutate(
        (pages) => {
          if (!pages) return pages;

          // Find the conversation across all loaded pages.
          const existingConversation = pages
            .flatMap((page) => page.conversations)
            .find((conversation) => conversation._id === conversationId);

          let updatedConversation: ConversationInboxItem;

          if (existingConversation) {
            updatedConversation = {
              ...existingConversation,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unreadCount:
                unreadCount ?? existingConversation.unreadCount + 1,
            };
          } else {
            // The conversation might not be present in the loaded inbox.
            // The message sender is the other participant.
            const sender = message.senderId;

            if (!sender || typeof sender !== "object") {
              return pages;
            }

            updatedConversation = {
              _id: conversationId,
              otherParticipant: {
                _id: String(sender._id),
                username: sender.username,
                imageUrl: sender.imageUrl,
              },
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unreadCount: unreadCount ?? 1,
              lastReadSeq: 0,
              otherParticipantLastReadSeq: 0,
            };
          }

          // Remove the old entry from every page.
          const updatedPages = pages.map((page) => ({
            ...page,
            conversations: page.conversations.filter(
              (conversation) => conversation._id !== conversationId
            ),
          }));

          // Put the updated conversation at the top of the inbox.
          if (updatedPages[0]) {
            updatedPages[0] = {
              ...updatedPages[0],
              conversations: [
                updatedConversation,
                ...updatedPages[0].conversations,
              ],
            };
          }

          return updatedPages;
        },
        { revalidate: false }
      );

      //   unstable_serialize((pageIndex, previousPageData) =>
      //     getKey(
      //       conversationId,
      //       pageIndex,
      //       previousPageData,

      //     )
      //   ),
      //   (pages) => {
      //     if (!pages?.length) return pages;

      //     const updatedPages = [...pages];

      //     const firstPage = updatedPages[0];

      //     if (!firstPage) return pages;

      //     const exists = updatedPages.some((page) =>
      //       page.messages.some(
      //         (item: { _id: string; }) => item._id === message._id
      //       )
      //     );

      //     if (exists) return pages;

      //     updatedPages[0] = {
      //       ...firstPage,
      //       messages: [...firstPage.messages, message].sort(
      //         (a, b) => a.sequence - b.sequence
      //       ),
      //     };

      //     return updatedPages;
      //   },
      //   { revalidate: false }
      // );
    },
    [mutate,]
  );

  // Update another conversation's read progress when its recipient
  // reads messages while the current user is elsewhere.
  const handleMessagesReadNotification = useCallback(
    async (payload: {
      conversationId: string;
      readerId: string;
      lastReadMessageId: string | null;
      lastReadSeq: number;
    }) => {
      const { conversationId, lastReadSeq } = payload;

      // Update a directly fetched conversation, if applicable.
      setDirectConversation((previous) => {
        if (previous?._id !== conversationId) return previous;

        return {
          ...previous,
          otherParticipantLastReadSeq: Math.max(
            previous.otherParticipantLastReadSeq ?? 0,
            lastReadSeq
          ),
        };
      });

      // Update the inbox SWR cache across all loaded pages.
      await mutate(
        (pages) => {
          if (!pages) return pages;

          return pages.map((page) => ({
            ...page,
            conversations: page.conversations.map((conversation) =>
              conversation._id === conversationId
                ? {
                  ...conversation,
                  otherParticipantLastReadSeq: Math.max(
                    conversation.otherParticipantLastReadSeq ?? 0,
                    lastReadSeq
                  ),
                }
                : conversation
            ),
          }));
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  // Listen for read receipts on the logged-in user's private channel.
  useEffect(() => {
    if (!currentUser?._id) return;

    return subscribe(
      "messages-read-notification",
      handleMessagesReadNotification
    );
  }, [
    currentUser?._id,
    subscribe,
    handleMessagesReadNotification,
  ]);

  // Subscribe to incoming message notifications for the logged-in user.
  useEffect(() => {
    if (!currentUser?._id) return;

    return subscribe(
      "new-message-notification",
      handleIncomingMessage
    );
  }, [currentUser?._id, subscribe, handleIncomingMessage]);


  // Update the URL when selecting a conversation.
  const handleSelectConversation = (
    conversationId: string
  ) => {
    setSelectedConversationId(conversationId);

    router.replace(
      `/messages?conversationId=${conversationId}`,
      { scroll: false }
    );
  };

  // Return to inbox on mobile.
  const handleBack = () => {
    setSelectedConversationId(null);
    setDirectConversation(null);

    router.replace("/messages", { scroll: false });
    // Refresh the inbox when returning to the conversation list.
  if (conversations.length === 0 && !isLoading) {
    void mutate();
  }
  };

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
        Loading your account...
      </div>
    );
  }


  return (

    <div
      style={{
        height: viewportHeight
          ? `calc(${viewportHeight}px - 64px)`
          : "calc(100dvh - 64px)",
      }}
      className="flex min-h-0 w-full overflow-hidden border border-outline-variant bg-surface "
    >
      {/* Inbox sidebar */}
      <aside
        className={`h-full w-full shrink-0 md:w-85 lg:w-95 ${selectedConversationId ? "hidden md:block" : "block"
          }`}
      >
        <ConversationList
          conversations={conversationsWithDirect}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </aside>

      {/* Chat panel */}
      <main
        className={`h-full min-w-0 flex-1 ${selectedConversationId ? "block" : "hidden md:block"
          }`}
      >
        {selectedConversation ? (
          <ChatWindow
            key={selectedConversation._id}
            conversation={selectedConversation}
            currentUserId={String(currentUser._id)}
            onBack={handleBack}
            onMessageSent={handleMessageSent}
            onUnreadCountChange={handleUnreadCountChange}
          />
        ) : selectedConversationId &&
          isLoadingDirectConversation ? (
          <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
            Loading conversation...
          </div>
        ) : selectedConversationId &&
          directConversationError ? (
          <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
            Unable to load this conversation.
          </div>
        ) : (
          <div className="hidden h-full flex-col items-center justify-center gap-3 text-center md:flex">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
              <MessageCircle
                size={30}
                className="text-on-surface-variant"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-on-surface">
                Your messages
              </h2>

              <p className="mt-1 text-sm text-on-surface-variant">
                Select a conversation to start chatting.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
