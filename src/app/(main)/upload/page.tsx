
"use client";

import { CldUploadWidget } from "next-cloudinary";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import { PlusCircle } from "lucide-react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import toastIcon from "@/helpers/toastHelper";
import axios from "axios";
import { notoSerif } from "@/app/fonts";

export default function UploadSection() {
  const handleUploadSuccess = async (
    results: CloudinaryUploadWidgetResults
  ) => {
    try {
      const info = results.info;

      if (!info || typeof info === "string") {
        toast.error("Invalid upload response");
        return;
      }

      await axios.post("/api/posts/upload-files", info);

      await toastIcon("Uploaded Successfully");
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error("Failed to save uploaded content");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center md:hidden w-full p-5">
        <h1 className={`${notoSerif.className} text-white text-lg`}>
          BRIZA
        </h1>
      </div>

      <div className="flex h-[75vh] md:h-full md:w-full items-center justify-center">
        <CldUploadWidget
          uploadPreset="Filess"
          onSuccess={(results) => {
            void handleUploadSuccess(results);
          }}
          onError={(error) => {
            console.error("Cloudinary Error:", error);
            toast.error("Upload failed");
          }}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open()}
              className="group flex items-center gap-3 px-7 py-4 bg-[#78e6c8] text-[#0b0d12] rounded-2xl md:text-lg font-semibold cursor-pointer shadow-[0_14px_40px_rgba(120,230,200,0.2)] hover:bg-[#9af0d9] hover:-translate-y-1 transition-all duration-300"
            >
              <span className="tracking-wide">Upload Content</span>

              <PlusCircle className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" />
            </button>
          )}
        </CldUploadWidget>
      </div>

      <Toaster />
    </>
  );
}
