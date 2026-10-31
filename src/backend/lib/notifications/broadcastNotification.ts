import{ pusher} from "@/backend/lib/pusher";
import { NotificationType } from "@/types/notification";

interface BroadcastNotificationInput {
  notification:NotificationType
}

export async function broadcastNotification({
  notification,
}: BroadcastNotificationInput) {
  try {
    await pusher.trigger(
      `private-user-${notification.recipient}`,
      "new-notification",
      {
        notification: notification
      }
    );
  } catch (error) {
    console.error("Failed to broadcast notification:", error);
  }
}