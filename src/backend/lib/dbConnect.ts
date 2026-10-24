import mongoose from "mongoose";
let isConnected:boolean=false;
export   async function Connect(){
    if(isConnected) return;
    try{
        await mongoose.connect(process.env.MONGO_URI! as string);
        isConnected=true;
        return mongoose.connection
    }
    catch(error){
        console.error("Database connection error:", error)
        throw error
    }
}
