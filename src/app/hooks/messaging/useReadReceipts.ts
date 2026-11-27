
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
    const inFlightPromiseRef = useRef<Promise<void> | null>(null);

    const sendReadRequest = useCallback(async (): Promise<void> => {
        // If a request is already running, wait for it first.
        if (inFlightPromiseRef.current) {
            await inFlightPromiseRef.current;

            // A newer sequence may have become visible while waiting.
            if (
                highestVisibleSeqRef.current >
                lastRequestedSeqRef.current
            ) {
                return sendReadRequest();
            }

            return;
        }

        const sequence = highestVisibleSeqRef.current;

        if (sequence <= lastRequestedSeqRef.current) return;

        inFlightRef.current = true;

        let requestSucceeded = false;

        const requestPromise = (async () => {
            try {
                const response = await markConversationRead(
                    conversationId,
                    sequence
                );

                const { lastReadSeq, unreadCount } = response.readState;

                lastRequestedSeqRef.current = Math.max(
                    lastRequestedSeqRef.current,
                    lastReadSeq
                );

                // This callback can update the parent inbox even after
                // ChatWindow has unmounted.
                onReadStateChange?.(unreadCount, lastReadSeq);

                requestSucceeded = true;
            } catch (error) {
                console.error("Failed to update read receipt:", error);
            }
        })();

        inFlightPromiseRef.current = requestPromise;

        try {
            await requestPromise;
        } finally {
            inFlightRef.current = false;
            inFlightPromiseRef.current = null;
        }

        // Send any newer read progress that appeared during the request.
        if (
            requestSucceeded &&
            highestVisibleSeqRef.current >
                lastRequestedSeqRef.current
        ) {
            return sendReadRequest();
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
        highestVisibleSeqRef.current = initialLastReadSeq;
        lastRequestedSeqRef.current = initialLastReadSeq;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            // Clear only the pending timer.
            // Do not invalidate or cancel an in-flight request.
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

    const flushPendingRead = useCallback(async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        await sendReadRequest();
    }, [sendReadRequest]);

    return {
        markVisible,
        markAllRead,
        flushPendingRead,
    };
};
