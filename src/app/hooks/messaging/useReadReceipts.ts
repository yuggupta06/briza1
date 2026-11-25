
"use client";

import { useCallback, useEffect, useRef } from "react";
import { markConversationRead } from "@/backend/lib/messaging/api";

interface UseReadReceiptsOptions {
    conversationId: string;
    initialLastReadSeq?: number;
    onReadStateChange?: (
        unreadCount: number,
        lastReadSeq: number
    ) => void;
}

export const useReadReceipts = ({
    conversationId,
    initialLastReadSeq = 0,
    onReadStateChange,
}: UseReadReceiptsOptions) => {
    const highestVisibleSeqRef = useRef(initialLastReadSeq);
    const lastRequestedSeqRef = useRef(initialLastReadSeq);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);
    const generationRef = useRef(0);

    const sendReadRequest = useCallback(async () => {
        if (inFlightRef.current) return;

        const sequence = highestVisibleSeqRef.current;

        if (sequence <= lastRequestedSeqRef.current) return;

        inFlightRef.current = true;

        const requestGeneration = generationRef.current;
        let requestSucceeded = false;

        try {
            const response = await markConversationRead(
                conversationId,
                sequence
            );

            if (requestGeneration !== generationRef.current) return;

            const { lastReadSeq, unreadCount } = response.readState;

            lastRequestedSeqRef.current = Math.max(
                lastRequestedSeqRef.current,
                lastReadSeq
            );

            onReadStateChange?.(unreadCount, lastReadSeq);

            requestSucceeded = true;
        } catch (error) {
            console.error("Failed to update read receipt:", error);
        } finally {
            if (requestGeneration === generationRef.current) {
                inFlightRef.current = false;

                if (
                    requestSucceeded &&
                    highestVisibleSeqRef.current >
                        lastRequestedSeqRef.current
                ) {
                    if (timerRef.current) {
                        clearTimeout(timerRef.current);
                    }

                    timerRef.current = setTimeout(() => {
                        timerRef.current = null;
                        void sendReadRequest();
                    }, 0);
                }
            }
        }
    }, [conversationId, onReadStateChange]);

    const scheduleReadRequest = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void sendReadRequest();
        }, 600);
    }, [sendReadRequest]);

    useEffect(() => {
        generationRef.current += 1;

        highestVisibleSeqRef.current = initialLastReadSeq;
        lastRequestedSeqRef.current = initialLastReadSeq;
        inFlightRef.current = false;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            generationRef.current += 1;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [conversationId, initialLastReadSeq]);

    const markVisible = useCallback(
        (sequence: number) => {
            if (!Number.isFinite(sequence) || sequence <= 0) return;

            highestVisibleSeqRef.current = Math.max(
                highestVisibleSeqRef.current,
                sequence
            );

            if (
                highestVisibleSeqRef.current <=
                lastRequestedSeqRef.current
            ) {
                return;
            }

            scheduleReadRequest();
        },
        [scheduleReadRequest]
    );

    const markAllRead = useCallback(
        (latestSequence: number) => {
            if (
                !Number.isFinite(latestSequence) ||
                latestSequence <= 0
            ) {
                return;
            }

            highestVisibleSeqRef.current = Math.max(
                highestVisibleSeqRef.current,
                latestSequence
            );

            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            void sendReadRequest();
        },
        [sendReadRequest]
    );

    return {
        markVisible,
        markAllRead,
    };
};
