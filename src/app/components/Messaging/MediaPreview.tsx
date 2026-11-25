
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, FileVideo } from "lucide-react";

interface MediaPreviewProps {
    files: File[];
    onRemove: (index: number) => void;
}

export default function MediaPreview({
    files,
    onRemove,
}: MediaPreviewProps) {
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    useEffect(() => {
        const urls = files.map((file) =>
            URL.createObjectURL(file)
        );

        setPreviewUrls(urls);

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [files]);

    if (files.length === 0) return null;

    return (
        <div className="flex gap-3 overflow-x-auto border-t border-outline-variant bg-surface px-3 py-3">
            {files.map((file, index) => {
                const isImage = file.type.startsWith("image/");
                const isVideo = file.type.startsWith("video/");
                const previewUrl = previewUrls[index];

                return (
                    <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container"
                    >
                        {previewUrl && isImage && (
                            <Image
                                src={previewUrl}
                                alt={file.name}
                                fill
                                unoptimized
                                className="object-cover"
                            />
                        )}

                        {previewUrl && isVideo && (
                            <video
                                src={previewUrl}
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                            />
                        )}

                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            aria-label={`Remove ${file.name}`}
                            className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                        >
                            <X size={14} />
                        </button>

                        {!isImage && !isVideo && (
                            <div className="flex h-full items-center justify-center">
                                <FileVideo size={24} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
