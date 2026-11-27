
"use client";

import { useCallback, useEffect, useState } from "react";

interface UseSelectionMessageReturn {
    selectedMessageIds: Set<string>;
    isSelectionMode: boolean;
    selectedCount: number;
    handleToggleMessageSelection: (messageId: string) => void;
    handleStartMessageSelection: (messageId: string) => void;
    handleCancelSelection: () => void;
}

export function useSelectionMessage(
    conversationId: string
): UseSelectionMessageReturn {
    const [selectedMessageIds, setSelectedMessageIds] =
        useState<Set<string>>(new Set());

    const isSelectionMode = selectedMessageIds.size > 0;
    const selectedCount = selectedMessageIds.size;

    // Toggle selection of an individual message.
    const handleToggleMessageSelection = useCallback(
        (messageId: string) => {
            setSelectedMessageIds((previous) => {
                const next = new Set(previous);

                if (next.has(messageId)) {
                    next.delete(messageId);
                } else {
                    next.add(messageId);
                }

                return next;
            });
        },
        []
    );

    // Start selection with the message that triggered long press.
    const handleStartMessageSelection = useCallback(
        (messageId: string) => {
            setSelectedMessageIds((previous) => {
                if (previous.has(messageId)) {
                    return previous;
                }

                return new Set(previous).add(messageId);
            });
        },
        []
    );

    // Clear all selected messages.
    const handleCancelSelection = useCallback(() => {
        setSelectedMessageIds(new Set());
    }, []);

    // Reset selection when switching conversations.
    useEffect(() => {
        setSelectedMessageIds(new Set());
    }, [conversationId]);

    // Escape cancels selection.
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

    return {
        selectedMessageIds,
        isSelectionMode,
        selectedCount,
        handleToggleMessageSelection,
        handleStartMessageSelection,
        handleCancelSelection,
    };
}
