import React from "react";
import axios from "axios"
type UserType = { clerkId: string; [key: string]: any };
type PostType = { likes: string[]; posturl: string; [key: string]: any };
type UserImageType = { user: UserType; [key: string]: any };
type ActiveImageType = { user: UserType; post: PostType; index: number };
type CommentType = unknown;
interface likedProps {
    user?: UserType,
    post: PostType,
    index: number,
    userWithImages: UserImageType[],
    setLikedPostNumber: React.Dispatch<React.SetStateAction<number>>,
    setUserWithImages: React.Dispatch<React.SetStateAction<UserImageType[]>>,
    currentUserId: string,
    showLike:boolean
}
export function likedImageUIUpdate(
    {
        post,
        index,
        userWithImages,
        setLikedPostNumber,
        setUserWithImages,
        currentUserId,
        showLike
    }: likedProps
) {
    if(!showLike){

        setLikedPostNumber(index)
        setTimeout(() => {
            setLikedPostNumber(-1)
        }, 1000);
    }
    // const currentPost = userWithImages[index].user.posts.find((p: { posturl: string; }) => p.posturl == url)
    let updatedLikes;
    if (post?.likes.includes(currentUserId)) {
        //remove the like
        updatedLikes = post.likes.filter((id: string) => id != currentUserId)
    }
    else {
        updatedLikes = [...post!.likes, currentUserId]  //add the like
    }
    const fakeImageArray = [...userWithImages]
    fakeImageArray[index] = {
        ...userWithImages[index],
        user: {
            ...userWithImages[index].user,
            posts:  [{ ...(userWithImages[index]?.user?.posts?.[0]! ?? {}), likes: updatedLikes }]
        } 
    }
    setUserWithImages(fakeImageArray)
}
export async function singleCLick(
    {
        user,
        post,
        index,
        userWithImages,
        setLikedPostNumber,
        setUserWithImages,
        currentUserId,
        showLike
    }: likedProps
) {
    likedImageUIUpdate({ post, index, userWithImages, setLikedPostNumber, setUserWithImages, currentUserId,showLike });
    try {
         await axios.post(
            "/api/posts/set-likes",
            {
                userClerkId:user?.clerkId,
                url:post.posturl,
            }
        )
    }
    catch (error) {
        console.error("Likes are not been updated on the post.", error)
    }
}


interface commentProps {
    user: UserType,
    post: PostType | undefined,
    index: number,
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    setActiveImage: React.Dispatch<React.SetStateAction<ActiveImageType | null>>,
    setCommentArray: React.Dispatch<React.SetStateAction<CommentType[]>>,
}
export async function getAllUsersWithComments(
    {
        user,
        post,
        index,
        setShow,
        setActiveImage,
        setCommentArray,
    }:
        commentProps
) {
    setShow(true);
    if(post){
        setActiveImage({  user,post, index});
    }
   
    try {
        const resBody = await axios.post("/api/posts/fetch_comments", {
            userPostClerkId:user.clerkId,
            posturl: post?.posturl
        })

        setCommentArray(resBody.data.commentArray);

    }
    catch (err) {
        console.error(err)
    }
}
interface sendCommentProps{
    comment:string,
    setComment:React.Dispatch<React.SetStateAction<string>>,
    activeImage:ActiveImageType,
    setCommentArray: React.Dispatch<React.SetStateAction<CommentType[]>>

}
export async function handleSendComment(
    {
        comment,
        setComment,
        activeImage,
        setCommentArray

    }
    :sendCommentProps
) {
        const commentString = comment.trim();
        if (commentString === "") return;
        setComment("");
        try {
            const resBody = await axios.post("/api/posts/set-comments", {
                comment: commentString,
                user: activeImage.user,
                url: activeImage.post.posturl

            })
            setCommentArray(resBody.data.commentArray)
        }
        catch (error) {
            console.error("Comment not Send.", error)
        }
    }
