"use client"
import { SignInButton,  useUser } from "@clerk/nextjs";
import axios from "axios"
import { useEffect, useState } from "react";
import Image from "next/image";
import {notoSerif} from "@/app/fonts";
import User from "@/app/components/User/Me/user";
import Loading from "@/app/components/User/otherUsers/user";

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();

  const [nameDialogBox, setNameDialogBox] = useState<boolean>(false);
  const [username, setUserName] = useState<string>("")
  const [userNameSubmitButton,setUserNameSubmitButton]=useState<boolean>(false)
  const [localData,setLocalData]=useState<boolean>(true)

  // Fetch profile from backend when signed in
  useEffect(() => {
    setLocalData(localStorage.getItem("briza-profile")?true :false)

    const fetchProfile = async () => {
      if(localStorage.getItem("briza-profile")){
          return ;
        }
      try {
        
        const resBody = await axios.post("/api/auth/signin", user);
        // set item to local Storage
       
        localStorage.setItem("briza-profile",JSON.stringify(resBody.data.currentUser[0]))
        setLocalData(true);
        if (resBody.data.status == 200) {
          setNameDialogBox(true)
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    
    if (isLoaded && isSignedIn) {
      fetchProfile();
    }
  }, [user,isLoaded, isSignedIn, user?.id]);


  const handleClick =async ()=>{
    if(username.trim()==""){
      alert("You must enter the username.")
      return;
    }
    try{
      const resBody=await axios.post("/api/auth/username_upload",{
        clerkId:user?.id,                                                     
        username:username,
      })
      setUserNameSubmitButton(true)
      setTimeout(() => {
        setUserNameSubmitButton(false)
      }, 3000);                                                    //For inserting username into user database.
      if(resBody.data.status==409){
        alert(resBody.data.message)               //Username already exist.
      }
      else{
        const newUpdatedUser=JSON.parse(localStorage.getItem("briza-profile") || "")         //upadte the username in localstorage
        newUpdatedUser.username=resBody.data.updatedUsername
        localStorage.setItem("briza-profile", JSON.stringify(newUpdatedUser));
        setNameDialogBox(false)
      }
    }
    catch(error){
      console.error("Username cannot be changed.",error)
    }
  }
  if (nameDialogBox ) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center  h-[70vh] md:h-screen bg-gradient-to-br  px-6">
        <div className="space-y-4 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          {/* Heading */}
          <h1 className={`text-3xl font-medium text-gray-800 mb-3 `}>
            Enter your username
          </h1>
          {/* Subtext */}
          <input
            className={`px-4 py-2 rounded-lg border border-gray-600 bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
            type="text"
            required
            value={username}
            maxLength={20}
            minLength={1}
            onChange={(e) => { setUserName(e.target.value) }}
          />
          <button
            className="w-1/2 bg-blue-500 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer"
            onClick={handleClick} disabled={userNameSubmitButton}
            >
            Submit
          </button>
        </div>
      </div>
    )
  }
  // 1️⃣ Clerk still loading → loader
  if (!isLoaded) {
    return (
      // <Loading classname="h-[80vh]" />
      <></>
    );
  }

  // 2️⃣ Not signed in → show sign-in button instantly
  if (!isSignedIn) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center  h-[70vh] md:h-screen bg-gradient-to-br  px-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Welcome Back!
          </h1>
          {/* Subtext */}
          <p className="text-gray-600 mb-8">
            Please sign in to access your profile and continue exploring.
          </p>

          {/* Sign In Button */}
          <SignInButton>
            <button className="w-full bg-blue-500 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // 3️⃣ Signed in but backend data loading → loader

  // 4️⃣ Signed in and data loaded → profile
  if (localData && user && user.id  ) {

    return (
      <>
          <div className="flex justify-between items-center md:hidden  w-full p-5">
            <h1 className={`${notoSerif.className} text-white text-lg`}>BRIZA</h1>
            <Image src="/images/menu.png" alt="Messages" width={20} height={20} />
          </div>
          {/* currentMe is used when we go to the profile page/ */}
        <User clerkId={user.id}  />          

        </>
    );
  }
}
