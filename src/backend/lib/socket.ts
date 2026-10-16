// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io("http://localhost:4000", {
      transports: ["websocket"], // more stable
      withCredentials: true,
    });
  }
  return socket;
};
