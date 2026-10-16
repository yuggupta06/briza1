"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, MessageCircle, Share2, X, Send } from "lucide-react";

import { notoSerif } from "@/app/fonts";
import Loading from "@/app/components/Loading/loading";

import {
    singleCLick,
    getAllUsersWithComments,
    handleSendComment,
} from "@/app/components/Like&Comments/postActions";

import { handleShare } from "@/backend/lib/share";

import { ActiveImageType } from "./types";
import { PostType } from "@/types/post";
import { CommentWithAuthor } from "@/types/comment";

import {
    imagesFeedReducer,
    initialState,
} from "./imageFeedReducer";
import PostCard from "../Posts/post";

export default function ImagesFeed() {
    // Reducer-managed UI state.
    const [state, dispatch] = useReducer(
        imagesFeedReducer,
        initialState
    );

    const { feed, modal, comments, likeAnimationIndex } = state;

    // Pagination and request control.
    const cursorRef = useRef<string | null>(null);
    const hasMoreImages = useRef(true); 
    const hasFetchedOnceRef = useRef(false);
    const isFetchingRef = useRef(false);
    const controllerRef = useRef<AbortController | null>(null);

    // DOM references.
    const loaderRef = useRef<HTMLDivElement>(null);
    const commentBoxRef = useRef<HTMLDivElement>(null);
    const commentRef = useRef<HTMLTextAreaElement>(null);

    
    // The helpers remain unchanged.
    const pendingActiveImageRef = useRef<ActiveImageType | null>(null);

    const setLikedPostNumber = useCallback(
        (value: number) => {
            dispatch({
                type: "SET_LIKE_ANIMATION_INDEX",
                payload: value,
            });
        },
        []
    );

    // Convert the old helper's active-image shape to your current type.
//     const setActiveImage = useCallback(
//     (legacyValue: any) => {
//         if (!legacyValue) {
//             pendingActiveImageRef.current = null;
//             dispatch({ type: "CLOSE_POST" });
//             return;
//         }

//         const legacyUser = legacyValue.user;
//         const legacyPost: PostType | undefined =
//             legacyValue.post ?? legacyUser?.posts?.[0];

//         if (!legacyUser || !legacyPost) {
//             return;
//         }

//         const active: ActiveImageType = {
//             postId: legacyPost.posturl,
//             imageUrl: legacyPost.posturl,
//             user: {
//                 username: legacyUser.username,
//                 imageUrl: legacyUser.imageUrl,
//             },
//             index: legacyValue.index ?? 0,
//             likeCount: legacyPost.likes,
//             // Changes needed
//             // isLiked: currentUserId
//             //     ? legacyPost.likes.includes(currentUserId)
//             //     : false,
//             isLiked:true,
//             postType: ""
//         };

//         pendingActiveImageRef.current = active;

//         dispatch({
//             type: "OPEN_POST",
//             payload: active,
//         });
//     },
//     [currentUserId]
// );


    const setCommentArray = useCallback(
        (value: CommentWithAuthor[]) => {
            dispatch({
                type: "SET_COMMENTS",
                payload: value,
            });
        },
        []
    );

    const setComment = useCallback(
        (value: string) => {
            dispatch({
                type: "SET_COMMENT_TEXT",
                payload: value,
            });
        },
        []
    );

    // Existing API calls are preserved.
    const fetchImages = async () => {
        if (!hasMoreImages.current || isFetchingRef.current) {
            return;
        }

        const controller = new AbortController();

        controllerRef.current = controller;
        isFetchingRef.current = true;

        dispatch({
            type: "SET_FEED_LOADING",
            payload: true,
        });

        try {
                    
            const response = await axios.get("/api/feed", {
                params: {
                    cursor: cursorRef.current,
                },
                signal: controller.signal,
            });
            
            dispatch({
                type: "APPEND_POSTS",
                payload: response.data.posts,

            });

            cursorRef.current = response.data.nextCursor;

            dispatch({
                type: "SET_CURSOR",
                payload: response.data.nextCursor,
            });

            if (response.data.nextCursor == null) {
                hasMoreImages.current = false;

                dispatch({
                    type: "SET_HAS_MORE",
                    payload: false,
                });
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("Images not found", error);
            }
        } finally {
            if (controllerRef.current === controller) {
                controllerRef.current = null;
            }

            isFetchingRef.current = false;

            // dispatch({
            //     type: "SET_FEED_LOADING",
            //     payload: false,
            // });
        }
    };

    // Fetch only after the user is signed in
    useEffect(() => {
        hasFetchedOnceRef.current = true;
        void fetchImages();
    }, []);

    // Lock body scrolling while the modal is open.
    useEffect(() => {
        document.body.style.overflow = modal.isOpen ? "hidden" : "auto";

        if (modal.isOpen) {
            commentBoxRef.current?.focus();
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [modal.isOpen]);
    // Infinite scrolling.
    useEffect(() => {
        const element = loaderRef.current;
        if (!element || !feed.hasMore) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {

                    void fetchImages();
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [feed.hasMore, fetchImages]);

    // Cancel an outstanding request on unmount.
    useEffect(() => {
        return () => {
            controllerRef.current?.abort();
        };
    }, []);

    // Initial loading only. Keep existing content during pagination.
    if (feed.loading && state.posts.length === 0) {
        return (
            <div className="flex h-[70vh] md:w-full md:h-full items-center justify-center relative">
                <Loading classname="70vh" />
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col items-center w-full max-w-5xl mx-auto px-0 sm:px-4 py-4 md:py-10 gap-y-5 md:gap-y-8">
                {state.posts.map((Post: PostType, index: number) => {
                        const {author}=Post;
                    // const isLiked = Boolean(
                    //     currentUserId &&
                    //     post.likes.includes(currentUserId)
                    // );

                    return (
                            <PostCard
                key={Post._id}
                Post={Post}
                index={index}
                likeAnimationIndex={likeAnimationIndex??-1}
            />
                    );
                })}
            </div>

            {/* Expanded image and comments modal */}
            <AnimatePresence>
                {modal.isOpen && modal.post && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                dispatch({ type: "CLOSE_POST" });
                                pendingActiveImageRef.current = null;
                            }}
                        />

                        <motion.div
                            layoutId={`image-${modal.post.index}`}
                            className="fixed inset-0 md:inset-12 z-50 flex flex-col md:flex-row items-center justify-center gap-4"
                        >
                            <div className="relative hidden md:flex md:flex-1 h-[40vh] md:h-[50vh] lg:h-[70vh] md:rounded-lg md:border md:border-white/60">
                                {(() => {

                                    if (!modal.post) {
                                        return null;
                                    }

                                    return modal.post.postType === "image" ? (
                                        <Image
                                            src={modal.post!.imageUrl}
                                            alt="Expanded"
                                            fill
                                            sizes="55vw"
                                            className="object-contain rounded-xl cursor-grab"
                                        />
                                    ) : (
                                        <video
                                            src={modal.post!.imageUrl}
                                            controls
                                            disablePictureInPicture
                                            muted
                                            className="object-contain w-full h-full rounded-lg cursor-grab"
                                        />
                                    );
                                })()}
                            </div>

                            <div className="relative bottom-12 md:bottom-0 h-[60%] w-[90%] md:w-[45%] md:h-[45vh] lg:h-[70vh] bg-black/60 border border-white/60 rounded-xl shadow-lg flex flex-col">
                                <div className="flex justify-end flex-shrink-0 p-2">
                                    <X
                                        className="cursor-pointer text-white"
                                        onClick={() => {
                                            pendingActiveImageRef.current = null;
                                            dispatch({ type: "CLOSE_POST" });
                                        }}
                                    />
                                </div>

                                <div
                                    ref={commentBoxRef}
                                    tabIndex={-1}
                                    className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 px-2"
                                    style={{ overflowAnchor: "none" }}
                                >
                                    {comments.items.map((commentItem:CommentWithAuthor, index) => (
                                        <div
                                            key={index}
                                            className="flex flex-col min-h-50px"
                                            style={{ willChange: "transform" }}
                                        >
                                            <div className="flex gap-x-2">
                                                <Image
                                                    priority
                                                    className="rounded-full md:w-[26px]"
                                                    src={commentItem.author.imageUrl}
                                                    alt={`user-${index}`}
                                                    height={22}
                                                    width={22}
                                                />

                                                <p
                                                    className={`${notoSerif.className} text-white text-sm md:text-md`}
                                                >
                                                    {commentItem.author.username}
                                                </p>
                                            </div>

                                            <p className="font-semibold select-text break-words text-white text-md md:text-lg ml-8">
                                                {commentItem.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-shrink-0 w-full flex items-center gap-x-2 p-2 bg-black border-t border-white/40 rounded-b-xl">
                                    <textarea
                                        ref={commentRef}
                                        value={comments.text}
                                        className="flex-1 px-2 py-1 rounded-md resize-none"
                                        placeholder="Write a comment..."
                                        rows={1}
                                        onChange={(e) => setComment(e.target.value)}
                                    />

                                    <Send
                                        className="cursor-pointer text-white hover:scale-110 hover:fill-blue-300 transition-transform duration-200"
                                        onClick={() => {
                                            const active = modal.post;

                                            if (!active) {
                                                return;
                                            }

                                            const item =
                                                state.posts[active.index];

                                            if (!item ) {
                                                return;
                                            }

                                            // Reconstruct the legacy object expected
                                            // by the existing comment helper.
                                            // handleSendComment({
                                            //     comment: comments.text,
                                            //     setComment,
                                            //     activeImage: {
                                            //         user: item.user,
                                            //         post: item,
                                            //         index: active.index,
                                            //     },
                                            //     setCommentArray:
                                            //         setCommentArray,
                                            // } as any);
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom loader for pagination */}
            <div
                ref={loaderRef}
                className="flex items-center justify-center w-full py-11"
            >
                {feed.hasMore &&
                    feed.loading &&
                    state.posts.length > 0 && (
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-white rounded-full animate-spin" />
                    )}
            </div>
        </>
    );
}
