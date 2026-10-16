import cron from "node-cron"
import { Connect } from "@/dbConnect/dbConnect";
import cloudinary from "@/lib/cloudinary";
import User from "@/models/userModel";

await Connect();
const getPublicIdFromUrl =(url)=>{
    const parts=url.split('/upload/')[1];
    const withoutVersion=parts.split("/").slice(1).join("/");
    return withoutVersion.replace(/\.[^/.]+$/, "");
}
async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}
async function cleanUpPosts() {
    cron.schedule("0 2 * * *",async()=>{
        // const cutOff=new Date(Date.now()-24*60*60*1000)
        try{
            const users=await User.find(
                {"posts.deleted":true}
            )
            for (const user of users){
                const remainingPosts=[];
                for(const post of user.posts){
                    if(post.deleted===true){
                        const publicId=getPublicIdFromUrl(post.posturl);
                        await deleteImage(publicId);
                    }
                    else{
                        remainingPosts.push(post);
                    }
                }
                user.posts=remainingPosts;
                await user.save();
            }
        }
        catch(error){
            console.error("cleanup failed",error)
        }
    
    })
}
cleanUpPosts();
export default cleanUpPosts