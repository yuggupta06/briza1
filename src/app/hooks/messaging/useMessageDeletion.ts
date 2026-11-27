
"use client";

import axios from "axios";
import { useCallback, useMemo, useState } from "react";

interface MessageSender {
    _id: string;
}

interface DeletableMessage {
    _id: string;
    senderId: string | MessageSender;
}

type DeleteFor = "me" | "everyone";

interface UseMessageDeletionProps {
    conversationId: string;
    currentUserId: string;
    messages: DeletableMessage[];
    selectedMessageIds: Set<string>;
    onDeleteSuccess?: (
        messageIds: string[],
        deleteFor: DeleteFor
    ) => void | Promise<void>;
}

interface UseMessageDeletionReturn {
    isDeleteDialogOpen: boolean;
    isDeleting: boolean;
    deleteError: string | null;
    canDeleteForEveryone: boolean;

    handleDeleteClick: () => void;
    handleCloseDeleteDialog: () => void;
    handleDeleteForMe: () => Promise<void>;
    handleDeleteForEveryone: () => Promise<void>;
}

export function useMessageDeletion({
    conversationId,
    currentUserId,
    messages,
    selectedMessageIds,
    onDeleteSuccess,
}: UseMessageDeletionProps): UseMessageDeletionReturn {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Find the selected messages.
    const selectedMessages = useMemo(() => {
        return messages.filter((message) =>
            selectedMessageIds.has(message._id)
        );
    }, [messages, selectedMessageIds]);

    // Delete for everyone is available only if every selected
    // message belongs to the current user.
    const canDeleteForEveryone =
        selectedMessages.length > 0 &&
        selectedMessages.length === selectedMessageIds.size &&
        selectedMessages.every((message) => {
            const senderId =
                typeof message.senderId === "string"
                    ? message.senderId
                    : message.senderId._id;

            return senderId === currentUserId;
        });

    // Open delete confirmation dialog.
    const handleDeleteClick = useCallback(() => {
        if (selectedMessageIds.size === 0 || isDeleting) return;

        setDeleteError(null);
        setIsDeleteDialogOpen(true);
    }, [selectedMessageIds, isDeleting]);

    // Close delete confirmation dialog.
    const handleCloseDeleteDialog = useCallback(() => {
        if (isDeleting) return;

        setIsDeleteDialogOpen(false);
        setDeleteError(null);
    }, [isDeleting]);

    // Shared deletion logic.
    const deleteMessages = useCallback(
        async (deleteFor: DeleteFor) => {
            const messageIds = Array.from(selectedMessageIds);

            if (messageIds.length === 0 || isDeleting) return;

            if (deleteFor === "everyone" && !canDeleteForEveryone) {
                setDeleteError(
                    "You can only delete your own messages for everyone."
                );
                return;
            }

            try {
                setIsDeleting(true);
                setDeleteError(null);

                await axios.delete(
                    `/api/conversations/${conversationId}/messages/delete`,
                    {
                        data: {
                            messageIds,
                            deleteFor,
                        },
                    }
                );

                // Update the local messages cache after API success.
                await onDeleteSuccess?.(messageIds, deleteFor);

                setIsDeleteDialogOpen(false);
            } catch (error) {
                console.error("Message deletion failed:", error);

                const message = axios.isAxiosError(error)
                    ? error.response?.data?.message
                    : null;

                setDeleteError(
                    message || "Unable to delete messages. Please try again."
                );
            } finally {
                setIsDeleting(false);
            }
        },
        [
            conversationId,
            selectedMessageIds,
            isDeleting,
            canDeleteForEveryone,
            onDeleteSuccess,
        ]
    );

    const handleDeleteForMe = useCallback(async () => {
        await deleteMessages("me");
    }, [deleteMessages]);

    const handleDeleteForEveryone = useCallback(async () => {
        await deleteMessages("everyone");
    }, [deleteMessages]);

    return {
        isDeleteDialogOpen,
        isDeleting,
        deleteError,
        canDeleteForEveryone,

        handleDeleteClick,
        handleCloseDeleteDialog,
        handleDeleteForMe,
        handleDeleteForEveryone,
    };
}
