
"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";

import {
    ArrowLeft,
    Send,
    Loader2,
    MessageCircle,
} from "lucide-react";

import { Avatar } from "@/app/components/ui/avatar";

import MessageBubble from "./MessageBubble";

import { useConversationMessages } from "@/app/hooks/messaging/useConversationMessages";
import { useRealtime } from "@/app/providers/RealtimeProvider";
import { useReadReceipts } from "@/app/hooks/messaging/useReadReceipts";

import { sendMessage } from "@/backend/lib/messaging/api";

import type {
    ConversationInboxItem,
    MessagingMessage,
} from "@/types/messaging-ui";

interface ChatWindowProps {
    conversation: ConversationInboxItem;
    currentUserId: string;
    onBack: () => void;
    onMessageSent: (
        conversationId: string,
        message: MessagingMessage
    ) => void;
    onUnreadCountChange: (
        conversationId: string,
        unreadCount: number
    ) => void;
}

export default function ChatWindow({
    conversation,
    currentUserId,
    onBack,
    onMessageSent,
    onUnreadCountChange,
}: ChatWindowProps) {
    const conversationId = conversation._id;
    const participant = conversation.otherParticipant;

    const {
        messages,
        isLoading,
        isLoadingMore,
        hasMore,
        loadOlder,
        addMessage,
    } = useConversationMessages(conversationId);
    const { subscribeToConversation } = useRealtime();
    const [lastReadSeq, setLastReadSeq] = useState(
    conversation.otherParticipantLastReadSeq ?? 0
);

    const handleUnreadCountChange = useCallback(
        (unreadCount: number) => {
            onUnreadCountChange(conversationId, unreadCount);
        },
        [conversationId, onUnreadCountChange]
    );

    const { markVisible } = useReadReceipts({
        conversationId,
        initialLastReadSeq: 0,
        onUnreadCountChange: handleUnreadCountChange,
    });

    const [content, setContent] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState("");

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const previousScrollHeightRef = useRef(0);
    const shouldRestoreScrollRef = useRef(false);
    const initialScrollDoneRef = useRef(false);
    const wasNearBottomRef = useRef(true);
    // Listen for new messages in the currently open conversation.
    useEffect(() => {
        return subscribeToConversation(
            conversationId,
            "new-message",
            (payload) => {
                // Insert the received message into the SWR cache.
                // addMessage should deduplicate using the message ID.
                void addMessage(payload.message);
            }
        );
    }, [
        conversationId,
        subscribeToConversation,
        addMessage,
    ]);
    // Determine whether the user is near the bottom.
    const handleScroll = () => {
        const container = scrollContainerRef.current;

        if (!container) return;

        const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;

        wasNearBottomRef.current = distanceFromBottom < 120;
    };

    // Preserve the current scroll position before loading older messages.
    const handleLoadOlder = async () => {
        const container = scrollContainerRef.current;

        if (
            !container ||
            isLoadingMore ||
            !hasMore
        ) {
            return;
        }

        previousScrollHeightRef.current =
            container.scrollHeight;

        shouldRestoreScrollRef.current = true;

        await loadOlder();
    };

    // Restore scroll position after older messages are rendered.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;

        if (
            !container ||
            !shouldRestoreScrollRef.current
        ) {
            return;
        }

        const newScrollHeight = container.scrollHeight;

        container.scrollTop =
            newScrollHeight - previousScrollHeightRef.current;

        shouldRestoreScrollRef.current = false;
    }, [messages]);

    // Scroll to the bottom when the conversation initially loads.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;

        if (
            !container ||
            isLoading ||
            initialScrollDoneRef.current
        ) {
            return;
        }

        container.scrollTop = container.scrollHeight;
        initialScrollDoneRef.current = true;
    }, [isLoading, messages.length]);

    // Scroll to the bottom when a new message arrives,
    // but only if the user was already near the bottom.
    useEffect(() => {
        const container = scrollContainerRef.current;

        if (
            !container ||
            !initialScrollDoneRef.current ||
            shouldRestoreScrollRef.current ||
            !wasNearBottomRef.current
        ) {
            return;
        }

        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    // Observe visible messages for read receipts.
    useEffect(() => {
        const container = scrollContainerRef.current;

        if (!container || messages.length === 0) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;

                    const sequence = Number(
                        (entry.target as HTMLElement).dataset.messageSequence
                    );

                    if (Number.isFinite(sequence)) {
                        markVisible(sequence);
                    }
                }
            },
            {
                root: container,
                threshold: 0.6,
            }
        );

        const messageElements =
            container.querySelectorAll<HTMLElement>(
                "[data-message-sequence]"
            );

        messageElements.forEach((element) => {
            observer.observe(element);
        });

        return () => {
            observer.disconnect();
        };
    }, [messages, markVisible]);

    // Send a text message.
    const handleSendMessage = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const trimmedContent = content.trim();

        if (!trimmedContent || isSending) {
            return;
        }

        setIsSending(true);
        setSendError("");

        try {
            const response = await sendMessage(conversationId, {
                messageType: "text",
                content: trimmedContent,
                attachments: [],
            });

            await addMessage(response.sentMessage);

            onMessageSent(
                conversationId,
                response.sentMessage
            );

            setContent("");
            wasNearBottomRef.current = true;
        } catch (error) {
            console.error("Message sending failed:", error);

            setSendError(
                "Couldn't send your message. Please try again."
            );
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
    setLastReadSeq((previous) =>
        Math.max(
            previous,
            conversation.otherParticipantLastReadSeq ?? 0
        )
    );
}, [conversation.otherParticipantLastReadSeq]);
useEffect(() => {
    return subscribeToConversation(
        conversationId,
        "messages-read",
        (payload) => {
            // Ignore our own read event.
            if (payload.readerId === currentUserId) {
                return;
            }

            setLastReadSeq((previous) =>
                Math.max(previous, payload.lastReadSeq)
            );
        }
    );
}, [
    conversationId,
    currentUserId,
    subscribeToConversation,
]);

    if (!participant) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                Conversation participant not found.
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface">
            {/* Chat header */}
            <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-outline-variant px-4 py-3">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to conversations"
                    className="rounded-full p-2 text-on-surface hover:bg-surface-container md:hidden"
                >
                    <ArrowLeft size={20} />
                </button>

                <Avatar
                    src={participant.imageUrl}
                    alt={participant.username}
                    size={42}
                />

                <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-on-surface">
                        {participant.username}
                    </h2>

                    <p className="text-xs text-on-surface-variant">
                        Conversation
                    </p>
                </div>
            </header>

            {/* Messages area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5"
            >
                {/* Load older messages */}
                {hasMore && (
                    <div className="mb-4 flex justify-center">
                        <button
                            type="button"
                            onClick={handleLoadOlder}
                            disabled={isLoadingMore}
                            className="rounded-full px-4 py-2 text-xs font-medium text-primary hover:bg-surface-container disabled:opacity-50"
                        >
                            {isLoadingMore
                                ? "Loading older messages..."
                                : "Load older messages"}
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2
                            className="animate-spin text-on-surface-variant"
                            size={24}
                        />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <MessageCircle
                            size={42}
                            className="text-on-surface-variant"
                        />

                        <div>
                            <p className="text-sm font-medium text-on-surface">
                                Start a conversation
                            </p>

                            <p className="mt-1 text-xs text-on-surface-variant">
                                Send a message to get things started.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {messages.map((message) => (
    <MessageBubble
        key={message._id}
        message={message}
        currentUserId={currentUserId}
        isSeen={
            (typeof message.senderId === "string"
                ? message.senderId
                : message.senderId._id.toString()) === currentUserId &&
            message.sequence <= lastReadSeq
        }
    />
))}
                    </div>
                )}


            </div>

            {/* Send error */}
            {sendError && (
                <p
                    role="alert"
                    className="shrink-0 px-4 pt-2 text-xs text-error"
                >
                    {sendError}
                </p>
            )}

            {/* Message composer */}
            <form
                onSubmit={handleSendMessage}
                className="relative z-10 flex shrink-0 items-end gap-2 border-t border-outline-variant bg-surface p-3 sm:p-4"
            >
                <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={(event) => {
                        if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                        ) {
                            event.preventDefault();

                            event.currentTarget.form?.requestSubmit();
                        }
                    }}
                    placeholder="Write a message..."
                    rows={1}
                    maxLength={5000}
                    disabled={isSending}
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary disabled:opacity-50"
                />

                <button
                    type="submit"
                    disabled={!content.trim() || isSending}
                    aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSending ? (
                        <Loader2 size={19} className="animate-spin" />
                    ) : (
                        <Send size={19} />
                    )}
                </button>
            </form>
        </div>
    );
}
