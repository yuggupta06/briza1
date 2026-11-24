
"use client";

import { useCallback, useEffect, useRef } from "react";

import { markConversationRead } from "@/backend/lib/messaging/api";

interface UseReadReceiptsOptions {
  conversationId: string;
  initialLastReadSeq?: number;
  onUnreadCountChange?: (unreadCount: number) => void;
}

export const useReadReceipts = ({
  conversationId,
  initialLastReadSeq = 0,
  onUnreadCountChange,
}: UseReadReceiptsOptions) => {
  const highestVisibleSeqRef = useRef(initialLastReadSeq);
  const lastRequestedSeqRef = useRef(initialLastReadSeq);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const inFlightRef = useRef(false);

  // Reset tracking when the user switches conversations.
  useEffect(() => {
    highestVisibleSeqRef.current = initialLastReadSeq;
    lastRequestedSeqRef.current = initialLastReadSeq;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    inFlightRef.current = false;

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [conversationId, initialLastReadSeq]);

  const sendReadRequest = useCallback(async () => {
    if (inFlightRef.current) return;

    const sequence = highestVisibleSeqRef.current;

    if (sequence <= lastRequestedSeqRef.current) {
      return;
    }

    inFlightRef.current = true;

    try {
      const response = await markConversationRead(
        conversationId,
        sequence
      );

      lastRequestedSeqRef.current = Math.max(
        lastRequestedSeqRef.current,
        response.readState.lastReadSeq
      );

      onUnreadCountChange?.(
        response.readState.unreadCount
      );
    } catch (error) {
      console.error("Failed to update read receipt:", error);
      // Keep the sequence pending. A later visibility event
      // can trigger another attempt.
    } finally {
      inFlightRef.current = false;
    }
  }, [conversationId, onUnreadCountChange]);

  const markVisible = useCallback(
    (sequence: number) => {
      if (
        !Number.isFinite(sequence) ||
        sequence <= 0
      ) {
        return;
      }

      highestVisibleSeqRef.current = Math.max(
        highestVisibleSeqRef.current,
        sequence
      );

      // Avoid scheduling duplicate requests.
      if (
        highestVisibleSeqRef.current <=
        lastRequestedSeqRef.current
      ) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Wait briefly for more messages to become visible.
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void sendReadRequest();
      }, 600);
    },
    [sendReadRequest]
  );

  return {
    markVisible,
  };
};
