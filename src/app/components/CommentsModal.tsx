
"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  X,
  Send,
} from "lucide-react";

import {
  handleSendComment,
} from "@/app/components/Like&Comments/postActions";

import {
  UserCommentType,
  ActiveImageType,
} from "@/types/types";

import { notoSerif } from "@/frontend/app/fonts";


type CommentsModalProps = {
  activeImage: ActiveImageType;
  comments: UserCommentType[];
  onClose: () => void;
  setComments: (
    comments: UserCommentType[]
  ) => void;
};


export default function CommentsModal({
  activeImage,
  comments,
  onClose,
  setComments,
}: CommentsModalProps) {

  const [comment, setComment] =
    useState("");

  const commentBoxRef =
    useRef<HTMLDivElement>(null);


  const handleSend = useCallback(
    async () => {

      if (!comment.trim()) return;

      await handleSendComment({
        comment,
        setComment,
        activeImage,
        setCommentArray: setComments,
      });

    },
    [
      comment,
      activeImage,
      setComments,
    ]
  );


  return (
    <AnimatePresence>

      {/* BACKDROP */}

      <motion.div
        className="
          fixed
          inset-0
          bg-black/60
          backdrop-blur-sm
          z-40
        "
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        onClick={onClose}
      />


      {/* MODAL */}

      <motion.div
        className="
          fixed
          inset-0
          md:inset-12
          z-50
          flex
          flex-col
          md:flex-row
          items-center
          justify-center
          gap-4
        "
        initial={{
          opacity: 0,
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          scale: 0.98,
        }}
      >

        {/* MEDIA */}

        <div className="
          relative
          hidden
          md:flex
          md:flex-1
          h-[50vh]
          lg:h-[70vh]
          rounded-lg
          border
          border-white/60
        ">

          {activeImage.post.postType ===
          "image" ? (

            <Image
              src={
                activeImage.post.posturl
              }
              alt="Expanded post"
              fill
              sizes="55vw"
              className="
                object-contain
                rounded-xl
              "
            />

          ) : (

            <video
              src={
                activeImage.post.posturl
              }
              controls
              muted
              className="
                object-contain
                w-full
                h-full
                rounded-lg
              "
            />

          )}

        </div>


        {/* COMMENTS */}

        <div className="
          relative
          h-[60%]
          w-[90%]
          md:w-[45%]
          md:h-[45vh]
          lg:h-[70vh]
          bg-black/60
          border
          border-white/60
          rounded-xl
          shadow-lg
          flex
          flex-col
        ">

          {/* CLOSE */}

          <div className="
            flex
            justify-end
            flex-shrink-0
            p-2
          ">

            <X
              className="
                cursor-pointer
                text-white
              "
              onClick={onClose}
            />

          </div>


          {/* COMMENT LIST */}

          <div
            ref={commentBoxRef}
            className="
              flex-1
              overflow-y-auto
              overflow-x-hidden
              space-y-3
              px-3
            "
          >

            {comments.map(
              (commentItem, index) => (

                <div
                  key={
                    commentItem._id ??
                    `${commentItem.username}-${index}`
                  }
                  className="flex flex-col"
                >

                  <div className="
                    flex
                    gap-x-2
                    items-center
                  ">

                    <Image
                      className="
                        rounded-full
                        md:w-[26px]
                      "
                      src={
                        commentItem.imageUrl
                      }
                      alt={
                        commentItem.username
                      }
                      height={22}
                      width={22}
                    />

                    <p
                      className={`
                        ${notoSerif.className}
                        text-white
                        text-sm
                        md:text-md
                      `}
                    >
                      {
                        commentItem.username
                      }
                    </p>

                  </div>


                  <p className="
                    font-semibold
                    select-text
                    break-words
                    text-white
                    text-md
                    md:text-lg
                    ml-8
                  ">
                    {commentItem.text}
                  </p>

                </div>

              )
            )}

          </div>


          {/* INPUT */}

          <div className="
            flex-shrink-0
            w-full
            flex
            items-center
            gap-x-2
            p-2
            bg-black
            border-t
            border-white/40
            rounded-b-xl
          ">

            <textarea
              value={comment}
              className="
                flex-1
                px-2
                py-1
                rounded-md
                resize-none
              "
              placeholder="Write a comment..."
              rows={1}
              onChange={(event) =>
                setComment(
                  event.target.value
                )
              }
              onKeyDown={(event) => {

                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  handleSend();
                }

              }}
            />

            <Send
              className="
                cursor-pointer
                hover:scale-110
                transition-transform
                duration-200
                text-white
              "
              onClick={handleSend}
            />

          </div>

        </div>

      </motion.div>

    </AnimatePresence>
  );
}

