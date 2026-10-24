"use client";

import { notoSerif } from "@/app/fonts";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

type SearchUser = {
  _id?: string;
  username: string;
  imageUrl?: string;
};

export default function SearchBar() {
  const [searchValue, setSearchValue] = useState("");
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [searchSectionLoading, setSearchSectionLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const controllerRef = useRef<AbortController | null>(null);

  const searchClick = async (value: string) => {
    setSearchValue(value);
    setSearchError("");

    // Cancel the previous search request.
    controllerRef.current?.abort();

    if (!value.trim()) {
      setSearchUsers([]);
      setSearchSectionLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setSearchSectionLoading(true);

    try {
      const resBody = await axios.post(
        "/api/search",
        { searchValue: value.trim() },
        { signal: controller.signal }
      );

      // Ignore stale responses.
      if (controller.signal.aborted) return;

      setSearchUsers(resBody.data.users || []);
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) return;

      console.error("Error in searching:", error);
      setSearchUsers([]);
      setSearchError("Unable to search right now. Please try again.");
    } finally {
      if (!controller.signal.aborted) {
        setSearchSectionLoading(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-start px-5 pt-5 md:items-center md:pt-20">
      <input
        className="w-full rounded-xl border-2 border-amber-50 px-3 py-2 text-white outline-none md:w-1/2"
        type="text"
        placeholder="Search users..."
        value={searchValue}
        onChange={(e) => void searchClick(e.target.value)}
      />

      {searchSectionLoading ? (
        <div className="flex h-[70vh] w-full items-center justify-center">
          <div
            role="status"
            aria-label="Searching users"
            className="h-12 w-12 animate-spin rounded-full border-4 border-gray-500 border-t-white"
          />
        </div>
      ) : searchError ? (
        <div className="flex h-[70vh] w-full items-center justify-center">
          <p className="text-center text-red-400">{searchError}</p>
        </div>
      ) : searchValue.trim() && searchUsers.length === 0 ? (
        <div className="flex h-[70vh] w-full items-center justify-center">
          <p className="text-center text-gray-400">
            No users found for {searchValue.trim()}.
          </p>
        </div>
      ) : (
        searchUsers.length > 0 && (
          <div className="w-full p-5 md:w-1/2">
            {searchUsers.map((user) => (
              <div
                key={user._id || user.username}
                className="w-full py-2"
              >
                <Link
                  prefetch={false}
                  className="flex items-center gap-x-4 rounded-lg p-2 transition hover:bg-white/5"
                  href={`/search/${encodeURIComponent(user.username)}`}
                >
                  {user.imageUrl ? (
                    <Image
                      className="rounded-full object-cover"
                      src={user.imageUrl}
                      alt={`${user.username}'s profile`}
                      width={45}
                      height={45}
                    />
                  ) : (
                    <div
                      className="h-[45px] w-[45px] shrink-0 rounded-full bg-gray-700"
                      aria-hidden="true"
                    />
                  )}

                  <p
                    className={`${notoSerif.className} mt-1 text-sm text-white md:text-lg`}
                  >
                    {user.username}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}