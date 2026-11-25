
import axios from "axios";

import type { MessagingMessage } from "@/types/messaging-ui";

interface UploadSignatureResponse {
    success: boolean;
    signature: string;
    timestamp: number;
    folder: string;
    apiKey: string;
    cloudName: string;
}

interface CloudinaryUploadResponse {
    secure_url: string;
    resource_type: "image" | "video";
    bytes: number;
    original_filename: string;
    format: string;
}

type MessageAttachment = MessagingMessage["attachments"][number];

export const uploadMessageMedia = async (
    file: File
): Promise<MessageAttachment> => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
        throw new Error("Only images and videos are supported.");
    }

    const signatureResponse = await axios.post<UploadSignatureResponse>(
        "/api/messages/upload-signature",
        {},
        { withCredentials: true }
    );

    const {
        signature,
        timestamp,
        folder,
        apiKey,
        cloudName,
    } = signatureResponse.data;

    const resourceType = isImage ? "image" : "video";

    const formData = new FormData();

    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", folder);
    formData.append("signature", signature);

    const uploadResponse = await axios.post<CloudinaryUploadResponse>(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        formData
    );

    const uploadedFile = uploadResponse.data;

    return {
        url: uploadedFile.secure_url,
        mediaType: resourceType,
        size: uploadedFile.bytes,
        name: `${uploadedFile.original_filename}.${uploadedFile.format}`,
    };
};
