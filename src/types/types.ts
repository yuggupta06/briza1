import type { Dispatch, SetStateAction } from "react";
import type { UserType } from "@/types/user";

export interface ChatMessage {
  sender: string;
  message: string;
  sendAt: string;
}

export interface ChatProps {
  allUsers: UserType[];
  selectedUser: UserType | null;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  setSelectedUser: Dispatch<SetStateAction<UserType | null>>;
  handleSendMessage: () => void;
  handleBackClick?: () => void;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  handleUserClick: (user: UserType) => void;
  profileName: string;
}
