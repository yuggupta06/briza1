
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { jwtVerify } from "jose";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const index = item.indexOf("=");
    if (index === -1) continue;

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

await app.prepare();

const httpServer = createServer((req, res) => {
  handle(req, res);
});

const io = new Server(httpServer, {
  // Same origin: Next.js and Socket.IO share port 3000.
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

io.use(async (socket, nextSocket) => {
  try {
    const token = getCookie(
      socket.handshake.headers.cookie,
      "token"
    );

    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      return nextSocket(new Error("Unauthorized"));
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    if (typeof payload.userId !== "string") {
      return nextSocket(new Error("Unauthorized"));
    }

    socket.data.userId = payload.userId;
    nextSocket();
  } catch {
    console.log("socket not connected")
    nextSocket(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;

  socket.join(`user:${userId}`);

  console.log(`Socket connected for user ${userId}`);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected for user ${userId}`);
  });
});

// Share the Socket.IO server with Next.js route handlers.
globalThis.brizaIO = io;
 
httpServer.listen(port, hostname, () => {
  console.log(`Briza running at http://${hostname}:${port}`);
});
