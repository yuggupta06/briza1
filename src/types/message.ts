
import { Types } from "mongoose";
import type { PopulatedUserType } from "./user";
import type { MessageContentType } from "./messaging-ui";

export type MessageMediaType = "image" | "video" | "file";

export type AttachmentType = {
  url: string;
  mediaType: MessageMediaType;
  size: number;
  name: string | null;
};

export interface MessageType {
  _id: Types.ObjectId;

  conversationId: Types.ObjectId;

  senderId: Types.ObjectId | PopulatedUserType;

  sequence: number;

  messageType: MessageContentType;

  content: string | null;

  attachments: AttachmentType[];

  editedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
