
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import axios from "axios";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import { Camera, LoaderCircle, UserRound, X } from "lucide-react";

import ProfileCanvas from "./profile-canvas";
import type { UserType } from "@/types/user";

type MeResponse = {
  success: boolean;
  user?: UserType;
  error?: string;
  message?: string;
};

export default function UserPage() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await axios.get<MeResponse>("/api/profile/me", {
        withCredentials: true,
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.data.success || !response.data.user) {
        throw new Error(
          response.data.error ||
          response.data.message ||
          "Could not load your profile."
        );
      }

      setCurrentUser(response.data.user);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ||
        error.response?.data?.message ||
        "Could not load your profile. Please sign in again."
        : error instanceof Error
          ? error.message
          : "Could not load your profile.";

      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const openModal = useCallback(() => {
    if (!currentUser) return;

    setUsername(currentUser.username);
    setProfileImage(currentUser.imageUrl || "");
    setUsernameTaken(false);
    setSaveError("");
    setIsUploading(false);
    setIsOpen(true);
  }, [currentUser]);

  const closeModal = useCallback(() => {
    if (isSaving || isUploading) return;

    setIsOpen(false);
    setSaveError("");
    setUsernameTaken(false);
  }, [isSaving, isUploading]);

  const handleAvatarUpload = useCallback(
    (result: CloudinaryUploadWidgetResults) => {
      if (result.event !== "success") return;

      const info = result.info;

      if (
        typeof info === "object" &&
        info !== null &&
        "secure_url" in info &&
        typeof info.secure_url === "string"
      ) {
        setProfileImage(info.secure_url);
        setSaveError("");
      } else {
        setSaveError("Cloudinary did not return a valid image URL.");
      }

      setIsUploading(false);
    },
    []
  );

  const handleSave = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!currentUser || isSaving || isUploading) return;

      const nextUsername = username.trim().replace(/^@/, "");

      if (nextUsername.length < 3 || nextUsername.length > 30) {
        setSaveError("Username must be between 3 and 30 characters.");
        return;
      }

      if (!/^[a-zA-Z0-9_.]+$/.test(nextUsername)) {
        setSaveError(
          "Use only letters, numbers, underscores, and periods."
        );
        return;
      }

      const nextImageUrl = profileImage || currentUser.imageUrl || "";

      if (
        nextUsername === currentUser.username &&
        nextImageUrl === (currentUser.imageUrl || "")
      ) {
        setIsOpen(false);
        return;
      }

      setIsSaving(true);
      setSaveError("");
      setUsernameTaken(false);

      try {
        const response = await axios.post<MeResponse>(
          "/api/profile/edit-profile",
          {
            username: nextUsername,
            imageUrl: nextImageUrl,
          },
          { withCredentials: true }
        );

        if (!response.data.success || !response.data.user) {
          throw new Error(
            response.data.error ||
            response.data.message ||
            "Could not update your profile."
          );
        }

        const updatedUser = response.data.user;
        // Create a new object reference to trigger the re-render.
        setCurrentUser((prev) =>
          prev ? { ...prev, ...updatedUser } : updatedUser
        );

        // Keep the modal fields in sync.
        setUsername(updatedUser.username);
        setProfileImage(updatedUser.imageUrl || "");

        // Clear errors and close the modal after success.
        setSaveError("");
        setUsernameTaken(false);
        setIsOpen(false);
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 409
        ) {
          setUsernameTaken(true);
          setSaveError("That username is already taken.");
        } else {
          setSaveError(
            axios.isAxiosError(error)
              ? error.response?.data?.error ||
              error.response?.data?.message ||
              "Could not save your profile."
              : error instanceof Error
                ? error.message
                : "Could not save your profile."
          );
        }
      } finally {
        setIsSaving(false);
      }
    },
    [currentUser, isSaving, isUploading, username, profileImage]
  );

  const signOut = useCallback(() => {
    void axios
      .post("/api/auth/logout", {}, { withCredentials: true })
      .catch(() => undefined)
      .finally(() => {
        window.location.assign("/login");
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 px-4 text-sm text-on-surface-variant">
        <LoaderCircle className="animate-spin" size={20} />
        Loading profile…
      </div>
    );
  }

  if (loadError || !currentUser) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-sm text-on-surface-variant">
          {loadError || "Your profile could not be loaded."}
        </p>

        <button
          type="button"
          onClick={() => void loadProfile()}
          className="rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm font-medium hover:bg-surface-container-high"
        >
          Try again
        </button>

        <a href="/login" className="text-sm text-primary underline">
          Go to login
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full min-w-0">
        <ProfileCanvas
          user={currentUser}
          onEditProfile={openModal}
          onSignOut={signOut}
        />
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/75 p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <form
            onSubmit={handleSave}
            className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-5 text-white shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Edit profile</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Update your username or profile photo.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving || isUploading}
                aria-label="Close edit profile"
                className="rounded-full p-2 hover:bg-white/10 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-neutral-800">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt="Profile preview"
                    fill
                    unoptimized
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <UserRound size={34} />
                  </div>
                )}

                <CldUploadWidget
                  uploadPreset="Filess"
                  options={{
                    multiple: false,
                    resourceType: "image",
                    clientAllowedFormats: [
                      "jpg",
                      "jpeg",
                      "png",
                      "webp",
                      "gif",
                    ],
                    maxFileSize: 5_000_000,
                  }}
                  onSuccess={handleAvatarUpload}
                  onError={(error) => {
                    console.error("Profile image upload failed:", error);
                    setIsUploading(false);
                    setSaveError("Could not upload the profile picture.");
                  }}
                  onClose={() => setIsUploading(false)}
                >
                  {({ open }) => (
                    <button
                      type="button"
                      onClick={() => {
                        setSaveError("");
                        setIsUploading(true);
                        open();
                      }}
                      disabled={isSaving || isUploading}
                      aria-label="Upload profile picture"
                      title="Change profile picture"
                      className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-neutral-950 bg-primary text-white shadow-md transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isUploading ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Camera size={17} />
                      )}
                    </button>
                  )}
                </CldUploadWidget>
              </div>
            </div>

            <label
              htmlFor="profile-username"
              className="mb-2 block text-sm font-medium"
            >
              Username
            </label>

            <input
              id="profile-username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setUsernameTaken(false);
                setSaveError("");
              }}
              minLength={3}
              maxLength={30}
              autoComplete="username"
              required
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-primary"
            />

            {usernameTaken && (
              <p className="mt-2 text-sm text-red-400">
                That username is already taken.
              </p>
            )}

            {saveError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {saveError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving || isUploading}
                className="h-11 flex-1 rounded-full border border-white/15 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                {isSaving
                  ? "Saving…"
                  : isUploading
                    ? "Uploading…"
                    : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
