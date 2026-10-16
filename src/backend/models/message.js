import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

        sentAt: {
            type: Date,
            default: Date.now
        }
    }
);

const Message =
    mongoose.models.Message ||
    mongoose.model("Message", messageSchema);

export default Message;


