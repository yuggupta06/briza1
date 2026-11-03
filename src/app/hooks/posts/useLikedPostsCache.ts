
"use client";

import type { PostType } from "@/types/post";
import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";

interface LikedPostsPage {
    items?: (PostType | null)[];
}

interface LikedPostUpdate {
    isLiked: boolean;
    likesCount: number;
}

export function useLikedPostsCache(userId: string) {
    const { mutate } = useSWRConfig();

    const updateLikedPosts = useCallback(
        (post: PostType, isLiked: boolean) => {
            if (!userId || !post?._id) return;

            const key = unstable_serialize(
                () => [`profile-liked-${userId}`, null] as const
            );

            void mutate(
                key,
                (pages: LikedPostsPage[] | undefined) => {
                    if (!pages?.length) return pages;

                    const updatedPost: PostType & LikedPostUpdate = {
                        ...post,
                        isLiked,
                        likesCount: Math.max(
                            0,
                            post.likesCount + (isLiked ? 1 : -1)
                        ),
                    };

                    const filteredPages = pages.map((page) => ({
                        ...page,
                        items: (page.items ?? []).filter(
                            (item: PostType | null) =>
                                item && item._id !== post._id
                        ),
                    }));

                    if (!isLiked) return filteredPages;

                    return filteredPages.map((page, index) =>
                        index === 0
                            ? {
                                ...page,
                                items: [updatedPost, ...page.items],
                            }
                            : page
                    );
                },
                { revalidate: false }
            );
        },
        [mutate, userId]
    );

    return { updateLikedPosts };
}
