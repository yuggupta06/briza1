
"use client";

import {
    memo,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

import {
    ArrowDown,
    ArrowLeft,
    ImagePlus,
    Loader2,
    MessageCircle,
    Send,
    Trash2,
    X,
} from "lucide-react";

import { Avatar } from "@/app/components/ui/avatar";

import MediaPreview from "./MediaPreview";
import MessageBubble from "./MessageBubble";

import { useConversationMessages } from "@/app/hooks/messaging/useConversationMessages";
import { useReadReceipts } from "@/app/hooks/messaging/useReadReceipts";
import { useRealtime } from "@/app/providers/RealtimeProvider";

import { sendMessage } from "@/backend/lib/messaging/api";
import { uploadMessageMedia } from "@/backend/lib/messaging/uploadMessageMedia";

import type {
    ConversationInboxItem,
    MessagingMessage,
} from "@/types/messaging-ui";

import { useSelectionMessage } from "@/app/hooks/messaging/useMessageSelection";
import { useMessageDeletion } from "@/app/hooks/messaging/useMessageDeletion";

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
        unreadCount: number,
        lastReadSeq: number
    ) => void;
}

function ChatWindow({
    conversation,
    currentUserId,
    onBack,
    onMessageSent,
    onUnreadCountChange,
}: ChatWindowProps) {
    const conversationId = conversation._id;
    const participant = conversation.otherParticipant;

    const openingLastReadSeqRef = useRef(
        conversation.lastReadSeq ?? 0
    );

    const openingHadUnreadMessagesRef = useRef(
        conversation.unreadCount > 0
    );

    const initialLastReadSeq = openingLastReadSeqRef.current;

    const {
        messages,
        isLoading,
        isLoadingMore,
        hasMore,
        loadOlder,
        loadNewer,
        loadLatest,
        addMessage,
        removeMessages,
    } = useConversationMessages(conversationId, {
        initialLastReadSeq,
    });

    const { subscribeToConversation } = useRealtime();

    const [lastReadSeq, setLastReadSeq] = useState(
        conversation.otherParticipantLastReadSeq ?? 0
    );

    const [unreadCount, setUnreadCount] = useState(
        conversation.unreadCount ?? 0
    );

    const handleReadStateChange = useCallback(
        (count: number, readSeq: number) => {
            setUnreadCount(count);

            onUnreadCountChange(
                conversationId,
                count,
                readSeq
            );
        },
        [conversationId, onUnreadCountChange]
    );

    const { markVisible, markAllRead, flushPendingRead } = useReadReceipts({
        conversationId,
        initialLastReadSeq,
        onReadStateChange: handleReadStateChange,
    });

    // Composer state
    const [content, setContent] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const previousScrollHeightRef = useRef(0);
    const shouldRestoreScrollRef = useRef(false);
    const initialScrollDoneRef = useRef(false);
    const wasNearBottomRef = useRef(false);
    const loadingNewerRef = useRef(false);
    const previousConversationIdRef = useRef(conversationId);



    // Reply state
    const [replyingTo, setReplyingTo] =
        useState<MessagingMessage | null>(null);

    // Selection hook
    const {
        selectedMessageIds,
        isSelectionMode,
        selectedCount,
        handleToggleMessageSelection,
        handleStartMessageSelection,
        handleCancelSelection,
    } = useSelectionMessage(conversationId);

    // For opening one single three dot menu options
    const [openMenuMessageId, setOpenMenuMessageId] =
        useState<string | null>(null);
    
    // Stable callbacks for memoized MessageBubble components.
    const handleReply = useCallback(
        (message: MessagingMessage) => {
            setReplyingTo(message);
        },
        []
    );

    const handleToggleSelectedMessage = useCallback(
        (messageId: string) => {
            handleToggleMessageSelection(messageId);
        },
        [handleToggleMessageSelection]
    );

    const handleStartSelectingMessage = useCallback(
        (messageId: string) => {
            handleStartMessageSelection(messageId);
        },
        [handleStartMessageSelection]
    );

    // Deletion hook
    const {
        isDeleteDialogOpen,
        isDeleting,
        deleteError,
        canDeleteForEveryone,
        handleDeleteClick,
        handleCloseDeleteDialog,
        handleDeleteForMe,
        handleDeleteForEveryone,
    } = useMessageDeletion({
        conversationId,
        currentUserId,
        messages,
        selectedMessageIds,
        onDeleteSuccess: async (messageIds: string[]) => {
            await removeMessages(messageIds);
            handleCancelSelection();
        },
    });
    // Handle back navigation
    const handleBack = useCallback(() => {
        // Start the pending read request before unmounting ChatWindow.
        void flushPendingRead();

        onBack();
    }, [flushPendingRead, onBack]);
    // Reset conversation-specific UI when switching conversations.
    useEffect(() => {
        if (previousConversationIdRef.current === conversationId) {
            return;
        }

        setReplyingTo(null);
        previousConversationIdRef.current = conversationId;

        initialScrollDoneRef.current = false;
        shouldRestoreScrollRef.current = false;
        wasNearBottomRef.current = false;
        loadingNewerRef.current = false;

        setUnreadCount(conversation.unreadCount ?? 0);
        setContent("");
        setSelectedFiles([]);
        setSendError("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [conversationId, conversation.unreadCount]);

    // Sync read position of the other participant.
    useEffect(() => {
        setLastReadSeq((previous) =>
            Math.max(
                previous,
                conversation.otherParticipantLastReadSeq ?? 0
            )
        );
    }, [conversation.otherParticipantLastReadSeq]);

    // Sync unread count when inbox data changes.
    useEffect(() => {
        setUnreadCount(conversation.unreadCount ?? 0);
    }, [conversationId, conversation.unreadCount]);

    // Listen for new messages in the current conversation.
    useEffect(() => {
        return subscribeToConversation(
            conversationId,
            "new-message",
            (payload) => {
                void addMessage(payload.message);
            }
        );
    }, [
        conversationId,
        subscribeToConversation,
        addMessage,
    ]);

    // Listen for messages deleted for everyone.
    useEffect(() => {
        return subscribeToConversation(
            conversationId,
            "messages-deleted",
            (payload) => {
                if (payload.deleteFor !== "everyone") return;

                void removeMessages(payload.messageIds);

                const updatedUnreadCount =
                    payload.unreadCounts[currentUserId];

                if (typeof updatedUnreadCount === "number") {
                    setUnreadCount(updatedUnreadCount);

                    onUnreadCountChange(
                        conversationId,
                        updatedUnreadCount,
                        initialLastReadSeq
                    );
                }
            }
        );
    }, [
        conversationId,
        currentUserId,
        subscribeToConversation,
        removeMessages,
        onUnreadCountChange,
        initialLastReadSeq,
    ]);

    // Listen for read receipts from the other participant.
    useEffect(() => {
        return subscribeToConversation(
            conversationId,
            "messages-read",
            (payload) => {
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

    // Escape key cancels selection mode.
    useEffect(() => {
        if (!isSelectionMode) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleCancelSelection();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isSelectionMode, handleCancelSelection]);

    // Reset selection when switching conversations.
    useEffect(() => {
        handleCancelSelection();
    }, [conversationId, handleCancelSelection]);

    // Load newer messages when reaching the loaded boundary.
    const handleLoadNewer = useCallback(async () => {
        if (loadingNewerRef.current || messages.length === 0) {
            return;
        }

        const lastLoadedSeq =
            messages[messages.length - 1]?.sequence ?? 0;

        const latestSequence =
            conversation.lastMessage?.sequence ?? lastLoadedSeq;

        if (lastLoadedSeq >= latestSequence) {
            return;
        }

        loadingNewerRef.current = true;

        try {
            await loadNewer(lastLoadedSeq);
        } catch (error) {
            console.error("Failed to load newer messages:", error);
        } finally {
            loadingNewerRef.current = false;
        }
    }, [
        messages,
        conversation.lastMessage?.sequence,
        loadNewer,
    ]);

    const handleScroll = () => {
        const container = scrollContainerRef.current;

        if (!container) return;

        const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;

        wasNearBottomRef.current = distanceFromBottom < 120;

        if (distanceFromBottom < 120) {
            void handleLoadNewer();
        }
    };

    // Preserve scroll position before loading older messages.
    const handleLoadOlder = async () => {
        const container = scrollContainerRef.current;

        if (!container || isLoadingMore || !hasMore) {
            return;
        }

        previousScrollHeightRef.current = container.scrollHeight;
        shouldRestoreScrollRef.current = true;

        await loadOlder();
    };

    // Restore scroll position after older messages render.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;

        if (!container || !shouldRestoreScrollRef.current) {
            return;
        }

        container.scrollTop =
            container.scrollHeight -
            previousScrollHeightRef.current;

        shouldRestoreScrollRef.current = false;
    }, [messages]);

    // Position at the unread boundary on initial load.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;

        if (
            !container ||
            isLoading ||
            messages.length === 0 ||
            initialScrollDoneRef.current
        ) {
            return;
        }

        if (unreadCount === 0) {
            container.scrollTop = container.scrollHeight;
            wasNearBottomRef.current = true;
        } else {
            const boundaryMessage = messages.find(
                (message) =>
                    message.sequence > initialLastReadSeq
            );

            if (boundaryMessage) {
                const element = container.querySelector<HTMLElement>(
                    `[data-message-sequence="${boundaryMessage.sequence}"]`
                );

                if (element) {
                    container.scrollTop =
                        element.offsetTop -
                        container.offsetTop -
                        16;
                }
            }

            wasNearBottomRef.current = false;
        }

        initialScrollDoneRef.current = true;
    }, [
        isLoading,
        messages,
        unreadCount,
        initialLastReadSeq,
    ]);

    // Scroll to bottom for new messages if already near bottom.
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

    // Observe visible messages and update read progress.
    useEffect(() => {
        const container = scrollContainerRef.current;

        if (
            !container ||
            !initialScrollDoneRef.current ||
            messages.length === 0
        ) {
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

        const elements =
            container.querySelectorAll<HTMLElement>(
                "[data-message-sequence]"
            );

        elements.forEach((element) => {
            observer.observe(element);
        });

        return () => observer.disconnect();
    }, [messages, markVisible]);

    // Jump to latest messages and mark everything read.
    const handleJumpToLatest = async () => {
        try {
            await loadLatest();

            const container = scrollContainerRef.current;

            if (!container) return;

            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth",
            });

            wasNearBottomRef.current = true;

            const latestSequence = Math.max(
                messages[messages.length - 1]?.sequence ?? 0,
                conversation.lastMessage?.sequence ?? 0
            );

            markAllRead(latestSequence);
        } catch (error) {
            console.error("Failed to load latest messages:", error);
        }
    };

    // Select images or videos.
    const handleFileSelection = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const files = Array.from(event.target.files ?? []);

        event.target.value = "";

        if (files.length === 0) return;

        const hasUnsupportedFile = files.some(
            (file) =>
                !file.type.startsWith("image/") &&
                !file.type.startsWith("video/")
        );

        if (hasUnsupportedFile) {
            setSendError("Only images and videos are supported.");
            return;
        }

        const firstFileIsImage = files[0].type.startsWith("image/");

        const hasMixedTypes = files.some((file) =>
            firstFileIsImage
                ? !file.type.startsWith("image/")
                : !file.type.startsWith("video/")
        );

        if (hasMixedTypes) {
            setSendError(
                "Please select either images or videos in one message."
            );
            return;
        }

        const existingType = selectedFiles[0]?.type.startsWith("image/")
            ? "image"
            : selectedFiles.length > 0
                ? "video"
                : null;

        const newType = firstFileIsImage ? "image" : "video";

        if (existingType && existingType !== newType) {
            setSendError(
                "You cannot mix images and videos in one message."
            );
            return;
        }

        setSendError("");

        setSelectedFiles((previous) => [
            ...previous,
            ...files,
        ]);
    };

    // Remove a selected file before sending.
    const handleRemoveFile = (index: number) => {
        setSelectedFiles((previous) =>
            previous.filter((_, fileIndex) => fileIndex !== index)
        );
    };

    // Send text, images, or videos.
    const handleSendMessage = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const trimmedContent = content.trim();

        if (
            (!trimmedContent && selectedFiles.length === 0) ||
            isSending
        ) {
            return;
        }

        setIsSending(true);
        setSendError("");

        try {
            let attachments: MessagingMessage["attachments"] = [];
            let messageType: "text" | "image" | "video" = "text";

            if (selectedFiles.length > 0) {
                const isImage = selectedFiles[0].type.startsWith("image/");

                messageType = isImage ? "image" : "video";

                attachments = await Promise.all(
                    selectedFiles.map((file) =>
                        uploadMessageMedia(file)
                    )
                );
            }

            const response = await sendMessage(conversationId, {
                messageType,
                content: trimmedContent || null,
                attachments,
                replyTo: replyingTo?._id ?? null,
            });

            await addMessage(response.sentMessage);

            onMessageSent(
                conversationId,
                response.sentMessage
            );

            setContent("");
            setReplyingTo(null);
            setSelectedFiles([]);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

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

    if (!participant) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                Conversation participant not found.
            </div>
        );
    }

    const firstUnreadMessage = messages.find(
        (message) =>
            message.sequence > initialLastReadSeq
    );

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface">
            {/* Chat header */}
            {isSelectionMode ? (
                <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-3">
                        <button onClick={handleCancelSelection}>
                            <X />
                        </button>

                        <span>{selectedMessageIds.size} selected</span>
                    </div>

                    <button
                        onClick={handleDeleteClick}
                        disabled={selectedMessageIds.size === 0}
                    >
                        <Trash2 className="h-6 w-6" />
                    </button>
                </div>
            ) : (
                <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-outline-variant px-4 py-3">
                    <button
                        type="button"
                        onClick={handleBack}
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
            )}

            {/* Messages area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5"
            >
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
                        {messages.map((message) => {
                            const showDivider =
                                openingHadUnreadMessagesRef.current &&
                                firstUnreadMessage?._id === message._id;

                            const senderId =
                                typeof message.senderId === "string"
                                    ? message.senderId
                                    : message.senderId._id.toString();

                            return (
                                <div key={message._id}>
                                    {showDivider && (
                                        <div
                                            id="new-messages-divider"
                                            className="my-4 flex items-center gap-3"
                                        >
                                            <div className="h-px flex-1 bg-outline-variant" />

                                            <span className="shrink-0 text-xs font-semibold text-primary">
                                                New Messages
                                            </span>

                                            <div className="h-px flex-1 bg-outline-variant" />
                                        </div>
                                    )}

                                    <MessageBubble
                                        message={message}
                                        currentUserId={currentUserId}
                                        isSeen={
                                            senderId === currentUserId &&
                                            message.sequence <= lastReadSeq
                                        }
                                        onReply={handleReply}
                                        isSelected={selectedMessageIds.has(message._id)}
                                        isSelectionMode={isSelectionMode}
                                        onToggleSelection={handleToggleSelectedMessage}
                                        onStartSelection={handleStartSelectingMessage}
                                        isMenuOpen={openMenuMessageId === message._id}
                                        onMenuToggle={() =>
                                            setOpenMenuMessageId((current) =>
                                                current === message._id ? null : message._id
                                            )
                                        }
                                        onMenuClose={() => setOpenMenuMessageId(null)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Floating unread button */}
                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={handleJumpToLatest}
                        aria-label={`Jump to latest messages, ${unreadCount} unread`}
                        className="sticky bottom-4 left-full z-20 flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container px-3 text-on-surface shadow-lg transition hover:bg-surface"
                    >
                        <ArrowDown size={19} />

                        <span className="text-xs font-semibold tabular-nums">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    </button>
                )}
            </div>

            {/* Delete confirmation dialog */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
                        <h2 className="text-lg font-semibold text-on-surface">
                            Delete messages?
                        </h2>

                        <p className="mt-2 text-sm text-on-surface-variant">
                            {selectedCount} selected messages
                        </p>

                        {deleteError && (
                            <p className="mt-3 text-sm text-error" role="alert">
                                {deleteError}
                            </p>
                        )}

                        <div className="mt-5 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={handleDeleteForMe}
                                disabled={isDeleting}
                                className="rounded-xl bg-surface-container px-4 py-3 text-sm font-medium disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Delete for me"}
                            </button>

                            {canDeleteForEveryone && (
                                <button
                                    type="button"
                                    onClick={handleDeleteForEveryone}
                                    disabled={isDeleting}
                                    className="rounded-xl bg-error px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    {isDeleting ? "Deleting..." : "Delete for everyone"}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleCloseDeleteDialog}
                                disabled={isDeleting}
                                className="rounded-xl px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
            {!isSelectionMode && (
                <form
                    onSubmit={handleSendMessage}
                    className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-outline-variant bg-surface p-3 sm:p-4"
                >
                    {replyingTo && (
                        <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container p-3">
                            <div className="min-w-0 flex-1 border-l-[3px] border-primary pl-3">
                                <p className="text-xs font-semibold text-primary">
                                    Replying to{" "}
                                    {typeof replyingTo.senderId === "string"
                                        ? replyingTo.senderId === currentUserId
                                            ? "yourself"
                                            : participant.username
                                        : replyingTo.senderId._id.toString() === currentUserId
                                            ? "yourself"
                                            : participant.username}
                                </p>

                                <p className="mt-1 truncate text-sm text-on-surface-variant">
                                    {replyingTo.content ||
                                        (replyingTo.messageType === "image"
                                            ? "Photo"
                                            : replyingTo.messageType === "video"
                                                ? "Video"
                                                : replyingTo.messageType === "file"
                                                    ? replyingTo.attachments[0]?.name ?? "File"
                                                    : "Message")}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                aria-label="Cancel reply"
                                disabled={isSending}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface hover:text-on-surface disabled:opacity-50"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    )}

                    <MediaPreview
                        files={selectedFiles}
                        onRemove={handleRemoveFile}
                    />

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        hidden
                        onChange={handleFileSelection}
                        disabled={isSending}
                    />

                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending}
                            aria-label="Attach images or videos"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-outline-variant text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ImagePlus size={20} />
                        </button>

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
                            disabled={
                                (!content.trim() && selectedFiles.length === 0) ||
                                isSending
                            }
                            aria-label="Send message"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSending ? (
                                <Loader2 size={19} className="animate-spin" />
                            ) : (
                                <Send size={19} />
                            )}
                        </button>
                    </div>

                    {isSending && selectedFiles.length > 0 && (
                        <p className="px-1 text-xs text-on-surface-variant">
                            Uploading media and sending message...
                        </p>
                    )}
                </form>
            )}
        </div>
    );
}

export default memo(ChatWindow);
