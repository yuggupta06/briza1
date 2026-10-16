import dns from "node:dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

await import("dotenv/config");

const { default: mongoose } = await import("mongoose");

try {
  console.log("Testing MongoDB connection...");

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  console.log("MongoDB connected successfully!");

  await mongoose.disconnect();
} catch (error) {
  console.error("Connection failed:", error);
}