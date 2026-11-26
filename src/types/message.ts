
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

// Information needed when a reply reference is populated.
export interface MessageReplyType {
  _id: Types.ObjectId;

  senderId: Types.ObjectId | PopulatedUserType;

  messageType: MessageContentType;

  content: string | null;

  attachments: AttachmentType[];

  createdAt: Date;
}

// Tracks an individual user's deletion of a message.
export interface MessageDeletedForType {
  userId: Types.ObjectId;

  deletedAt: Date;
}

export interface MessageType {
  _id: Types.ObjectId;

  conversationId: Types.ObjectId;

  senderId: Types.ObjectId | PopulatedUserType;

  sequence: number;

  messageType: MessageContentType;

  content: string | null;

  attachments: AttachmentType[];

  editedAt: Date | null;

  // Can be an ObjectId before population or a populated message.
  replyTo: Types.ObjectId | MessageReplyType | null;

  // Users who deleted this message for themselves.
  deletedFor: MessageDeletedForType[];

  // Global deletion information.
  deletedForEveryoneAt: Date | null;

  deletedForEveryoneBy: Types.ObjectId | null;

  createdAt: Date;

  updatedAt: Date;
}
