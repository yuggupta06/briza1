export type ConversationType = {
    _id: string;
    participants: string[];
    lastMessage: string;
    lastMessageAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};