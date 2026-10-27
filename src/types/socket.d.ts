
import type { Server } from "socket.io";

declare global {
  var brizaIO: Server | undefined;
}

export {};
