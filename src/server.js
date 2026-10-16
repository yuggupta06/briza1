import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose"
import Redis from "ioredis"
const httpServer = createServer();


const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000", // your Next.js frontend
        methods: ["GET", "POST"]
    }
})
const publisher = new Redis("redis://default:AUGtAAIncDI3OGQ2OTM4N2M1NTM0YTZmOTViNDY2Yzg5NmFiYjQ5N3AyMTY4MTM@flowing-doberman-16813.upstash.io:6379",
    {tls:{}}
)
const subscriber = new Redis("redis://default:AUGtAAIncDI3OGQ2OTM4N2M1NTM0YTZmOTViNDY2Yzg5NmFiYjQ5N3AyMTY4MTM@flowing-doberman-16813.upstash.io:6379",{
    tls:{}
})

publisher.on("connect", () => console.log("Connected to Redis ✅"));
publisher.on("error", (err) => console.error("Redis error ❌", err));




subscriber.subscribe("chat", (err, count) => {
    if (err) {
        console.log("Error in subscribing", err);
    }
    else {
        console.log("Subscribed to channel", `${count}`)
    }
})

subscriber.on("message", (channel, message) => {
    const data = JSON.parse(message);
    const { selectedUser, messageFormat } = data;
    // console.log(messageFormat)
    console.log(selectedUser)
    if (selectedUser.socketId != "") {
        io.to(selectedUser.socketId).emit("received-message", messageFormat)
    }
})



io.on("connection", async (socket) => {
    console.log("user-connected")
    
    socket.on("changed-socket-id", (message) => {
        socket.broadcast.emit("Notification changed socket-id", message)
    })
    socket.on("send-message", async (message) => {
        const { selectedUser, messageFormat } = message
        // console.log(message)
        try {
            const sender = messageFormat.sender;
            const receiver = selectedUser.username
            const combinedName = [sender, receiver].sort().join('&');
            await publisher.rpush(combinedName, JSON.stringify(messageFormat));
            await publisher.ltrim(combinedName, -100, -1);
            publisher.publish("chat", JSON.stringify(message))
        }
        catch (error) {
            console.error(error);
        }

    })
    socket.on("disconnect", () => {
        console.log("socket disconnected")
    })
})

httpServer.listen(4000, () => {
    console.log("Server is connected.")
})