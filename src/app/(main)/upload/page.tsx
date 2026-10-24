
"use client";

import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import {
  ImagePlus,
  X,
  Loader2,
  Upload,
  CheckCircle2,
} from "lucide-react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import toastIcon from "@/helpers/toastHelper";
import { notoSerif } from "@/app/fonts";

type UploadedMedia = {
  url: string;
  publicId: string;
  fileName: string;
  format: string;
  resourceType: "image" | "video" | "raw";
  bytes: number;
};

export default function UploadSection() {
  const [uploadedMedia, setUploadedMedia] =
    useState<UploadedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isModalOpen = uploadedMedia !== null || showSuccess;

  const closeModal = useCallback(() => {
    if (isSaving) return;

    setUploadedMedia(null);
    setCaption("");
    setShowSuccess(false);
  }, [isSaving]);

  // Lock background scrolling while either modal is open.
 

useEffect(() => {
  if (!isModalOpen) return;

  const body = document.body;
  const html = document.documentElement;

  const previousBodyOverflow = body.style.overflow;
  const previousHtmlOverflow = html.style.overflow;

  body.style.overflow = "hidden";
  html.style.overflow = "hidden";

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !isSaving) {
      closeModal();
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    body.style.overflow = previousBodyOverflow;
    html.style.overflow = previousHtmlOverflow;

    window.removeEventListener("keydown", handleKeyDown);
  };
}, [isModalOpen, isSaving, closeModal]);



  const handleUploadSuccess = (
    results: CloudinaryUploadWidgetResults
  ) => {
    const info = results.info;

    if (!info || typeof info === "string") {
      toast.error("Could not read uploaded media details");
      return;
    }

    const url = info.secure_url || info.url;

    if (!url) {
      toast.error("Uploaded media URL is missing");
      return;
    }

    const resourceType =
      info.resource_type === "video"
        ? "video"
        : info.resource_type === "raw"
          ? "raw"
          : "image";

    setUploadedMedia({
      url,
      publicId: info.public_id ?? "",
      fileName: info.original_filename ?? "Uploaded content",
      format: info.format ?? "",
      resourceType,
      bytes: info.bytes ?? 0,
    });

    setCaption("");
    setShowSuccess(false);
  };

  const handleSharePost = async () => {
    if (!uploadedMedia || isSaving) return;

    setIsSaving(true);

    try {
      await axios.post("/api/posts/upload-files", {
        secure_url: uploadedMedia.url,
        resource_type: uploadedMedia.resourceType,
        caption: caption.trim(),
      });

      setUploadedMedia(null);
      setCaption("");
      setShowSuccess(true);

      await toastIcon("Post published successfully");
    } catch (error) {
      console.error("Error publishing post:", error);

      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Failed to publish post"
        );
      } else {
        toast.error("Failed to publish post");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
        }}
      />

      <main className="relative flex min-h-dvh w-full flex-col bg-[#0b0d12] text-white md:min-h-0 md:bg-transparent">
        {/* Mobile heading */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-4 md:hidden">
          <h1
            className={`${notoSerif.className} text-lg tracking-wide`}
          >
            BRIZA
          </h1>

          <span className="text-xs text-gray-400">
            Create a post
          </span>
        </header>

        {/* Upload area */}
        <section className="flex min-h-[calc(100dvh-4rem-57px)] flex-1 items-center justify-center px-4 py-8 pb-24 sm:px-6 md:min-h-[70dvh] md:pb-8 lg:px-10">
          <div className="flex w-full max-w-xl flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#78e6c8]/20 bg-[#78e6c8]/10 text-[#78e6c8] sm:h-24 sm:w-24">
              <ImagePlus className="h-9 w-9 sm:h-11 sm:w-11" />
            </div>

            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Share your perspective
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400 sm:text-base">
              Upload an image or video and add a caption to share
              your latest creation with the Briza community.
            </p>

            <CldUploadWidget
              uploadPreset="Filess"
              options={{
                multiple: false,
                resourceType: "auto",
                clientAllowedFormats: [
                  "jpg",
                  "jpeg",
                  "png",
                  "webp",
                  "gif",
                  "mp4",
                  "mov",
                  "webm",
                ],
                maxFileSize: 50_000_000,
              }}
              onSuccess={handleUploadSuccess}
              onError={(error) => {
                console.error("Cloudinary upload error:", error);
                toast.error("Upload failed. Please try again.");
              }}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  className="group mt-7 flex min-h-12 w-full max-w-xs cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#78e6c8] px-6 py-3.5 font-semibold text-[#0b0d12] shadow-[0_14px_40px_rgba(120,230,200,0.15)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#9af0d9] active:scale-[0.98] sm:w-auto sm:min-w-64"
                >
                  <span>Upload Content</span>
                  <ImagePlus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                </button>
              )}
            </CldUploadWidget>

            <p className="mt-4 text-xs text-gray-500">
              Images and videos · Maximum file size 50 MB
            </p>
          </div>
        </section>
      </main>

      {/* Create post modal */}
      {uploadedMedia && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isSaving
            ) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-post-title"
            className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            {/* Modal header */}
            <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <h2
                  id="create-post-title"
                  className="text-lg font-semibold"
                >
                  Create post
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Preview your content before sharing
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="Close modal"
                className="rounded-full p-2 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Scrollable modal content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {/* Media preview */}
              <div className="mb-5 flex min-h-36 max-h-[35dvh] items-center justify-center overflow-hidden rounded-xl bg-black sm:max-h-[40dvh]">
                {uploadedMedia.resourceType === "image" ? (
                  <Image
                    src={uploadedMedia.url}
                    alt={uploadedMedia.fileName}
                    width={1200}
                    height={900}
                    unoptimized
                    className="block max-h-[35dvh] w-auto max-w-full object-contain sm:max-h-[40dvh]"
                  />
                ) : uploadedMedia.resourceType === "video" ? (
                  <video
                    src={uploadedMedia.url}
                    controls
                    playsInline
                    className="block max-h-[35dvh] max-w-full object-contain sm:max-h-[40dvh]"
                  >
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 text-gray-300">
                    <Upload className="h-10 w-10 text-[#78e6c8]" />
                    <p className="break-all text-center text-sm">
                      {uploadedMedia.fileName}
                    </p>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label
                  htmlFor="post-caption"
                  className="mb-2 block text-sm font-medium text-gray-200"
                >
                  Caption
                </label>

                <textarea
                  id="post-caption"
                  value={caption}
                  onChange={(event) =>
                    setCaption(event.target.value)
                  }
                  placeholder="Write a caption... What's on your mind?"
                  maxLength={500}
                  rows={4}
                  disabled={isSaving}
                  className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-500 focus:border-[#78e6c8] disabled:opacity-60"
                />

                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                  <span>Add a description to your post</span>
                  <span className="shrink-0 tabular-nums">
                    {caption.length}/500
                  </span>
                </div>
              </div>

              {/* File details */}
              <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <p className="truncate text-sm font-medium text-gray-200">
                  {uploadedMedia.fileName}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {uploadedMedia.format.toUpperCase() ||
                    uploadedMedia.resourceType}
                  {" · "}
                  {uploadedMedia.bytes > 0
                    ? `${(
                        uploadedMedia.bytes /
                        (1024 * 1024)
                      ).toFixed(2)} MB`
                    : "Size unavailable"}
                </p>
              </div>
            </div>

            {/* Fixed modal footer */}
            <footer className="shrink-0 border-t border-white/10 bg-[#111318] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                onClick={handleSharePost}
                disabled={isSaving}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#78e6c8] px-4 py-3 font-semibold text-[#0b0d12] transition hover:bg-[#9af0d9] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Share post
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-success-title"
            className="my-auto w-full max-w-sm rounded-2xl border border-white/10 bg-[#111318] p-6 text-center text-white shadow-2xl sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#78e6c8]/10">
              <CheckCircle2 className="h-9 w-9 text-[#78e6c8]" />
            </div>

            <h2
              id="upload-success-title"
              className="mt-5 text-xl font-semibold"
            >
              Post published!
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Your content has been saved successfully.
            </p>

            <button
              type="button"
              onClick={closeModal}
              className="mt-6 min-h-12 w-full rounded-xl bg-[#78e6c8] px-4 py-3 font-semibold text-[#0b0d12] transition hover:bg-[#9af0d9] active:scale-[0.99]"
            >
              Done
            </button>
          </section>
        </div>
      )}
    </>
  );
}
