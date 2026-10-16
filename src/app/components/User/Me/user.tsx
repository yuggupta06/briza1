"use client"
import {notoSerif} from "@/app/fonts";
import Post from "@/app/components/Posts/post";
import Image from "next/image";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
interface UserType {
  username: string;
  name: string;
  imageUrl: string;
  postLength: number;
  followers: number;
  following: number;
}
import { X, Camera, User2 } from 'lucide-react';
import axios from "axios";
import { Clerk } from "@clerk/clerk-sdk-node";
const clerkClient = Clerk({ apiKey: process.env.CLERK_SECRET_KEY });

export default function User({clerkId}:{clerkId:string}) {

  const [currentUser,setCurrentUser]=useState<UserType | null>(null)
  const [numberOfPosts, setNumberOfPosts] = useState<number>(currentUser?.postLength || 0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(currentUser?.username || "" );                   // this is to alter the input field section.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showUserLabel, setShowUserLabel] = useState<boolean>(false)                            // show that the username auto exists or not 
useEffect(()=>{
      const stored = localStorage.getItem("briza-profile");

  // 2️⃣ Safely parse it
  let parsedProfile = null;
  try {
    parsedProfile = stored ? JSON.parse(stored) : null;
  } catch {
    parsedProfile = null;
  }

  // 3️⃣ Choose your default user
  const initialUser = Array.isArray(parsedProfile) ? parsedProfile[0] : parsedProfile;
  setCurrentUser(initialUser)
  setNumberOfPosts(initialUser.postLength)

},[])
  // Event handlers with proper TypeScript types
  const openModal = (): void => {
    setUsername(currentUser!.username)
    setIsOpen(true);
  }
  const closeModal = (): void => {
    setIsOpen(false);
    setShowUserLabel(false)
  }
async function uploadBase64ToClerk(base64: string, filename: string ) {
  const response = await fetch("https://api.clerk.dev/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: filename,
      file: base64,
      content_type: "image/png"
    }),
  });

  const data = await response.json();
  return data.file_url; // Clerk image URL
}
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        console.error('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>): void => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setProfileImage(result);
        }
      };

      reader.onerror = (): void => {
        console.error('Error reading file');
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if(username===currentUser!.username && !selectedFile){
      closeModal()
      return;
    }
    // Validate username
    if (!username.trim()) {
      alert("Username is required")
      return;
    }
    var clerkImageUrl=currentUser!.imageUrl
    try {
      if(profileImage && selectedFile){
        clerkImageUrl = await uploadBase64ToClerk(profileImage, selectedFile.name);
      }
      const resBody = await axios.post("/api/edit-profile", { clerkId:clerkId, name: username,imageUrl:clerkImageUrl });

      if (resBody.data.status == 409) {
        setShowUserLabel(true);
        return;
      }
      const newUpdatedUser=JSON.parse(localStorage.getItem("briza-profile") || "")        //update the username in localstorage
      newUpdatedUser.username=resBody.data.currentUser.username
      newUpdatedUser.imageUrl=clerkImageUrl
      setCurrentUser(newUpdatedUser)
      localStorage.setItem("briza-profile", JSON.stringify(newUpdatedUser));
      
    }
    catch(error) {
      console.log("Error in updating username",error)
    }


    closeModal();
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
  };


  return (
    <>
    {
      currentUser && (
    <div className="flex flex-col gap-y-3 min-h-screen">
      <div>
        {/* Enhanced Upper Section with Background */}
        <div className="flex md:flex-col lg:flex-row pt-2 px-5 md:px-30 md:pt-20 relative">

          {/* Background Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-600/5 rounded-2xl"></div>

          {/* Profile Image & Username Section */}
          <div className="flex flex-col md:justify-start justify-center md:items-center gap-x-10 pr-2 lg:pr-0 md:pb-4 relative z-10">

            {/* Enhanced Profile Image Container */}
            <div className="relative group">
              {/* Profile Image */}
              <div className="relative">
                <Image
                  priority
                  className="rounded-full md:w-[112px] relative z-10 border-4 border-gray-800/50 shadow-2xl transform transition-all duration-300 group-hover:scale-105"
                  src={currentUser!.imageUrl}
                  alt="My-profile"
                  width={60}
                  height={60}
                />

                {/* Status Indicator */}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full shadow-lg animate-pulse"></div>
              </div>
            </div>

            {/* Enhanced Username */}
            <div className="relative mt-2 group">
              <p className={`${notoSerif.className} text-white text-sm font-medium tracking-wide transition-colors duration-300`}>
                {currentUser!.username}
              </p>
              <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Stats and Info Section */}
          <div className="flex flex-col flex-1 lg:pl-[5rem] lg:gap-y-4 relative z-10">

            {/* Name and Edit Button */}
            <div className="lg:flex items-center w-[90%] hidden relative">
              <div className="flex items-center space-x-4">
                <h1 className={`${notoSerif.className} text-white text-2xl mt-2 font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text `}>
                  {currentUser!.name}
                </h1>

                {/* Verified Badge */}
                <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Enhanced Edit Button */}
              <button
                onClick={openModal}
                type="button"
                className="mx-auto relative overflow-hidden group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                           text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 
                           transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 border border-white/20 cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                <span className="relative flex items-center space-x-2">
                  <span className="text-sm">Edit Profile</span>
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </span>
              </button>
            </div>

            {/* Enhanced Stats Section */}
            <div className="flex justify-between pt-2 md:justify-start md:items-center md:gap-x-16 relative">

              {/* Posts Stat */}
              <div className="md:flex md:gap-x-3 group cursor-pointer transition-all duration-300 hover:transform hover:scale-105">
                <div className="relative">
                  <p className="text-white text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text ">
                    {numberOfPosts}
                  </p>
                </div>
                <span className={`${notoSerif.className} text-gray-300 text-sm font-medium group-hover:text-white transition-colors duration-300`}>
                  Posts
                </span>
              </div>

              {/* Followers Stat */}
              <div className="md:flex md:gap-x-3 group cursor-pointer transition-all duration-300 hover:transform hover:scale-105">
                <div className="relative">
                  <p className="text-white text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text ">
                    {currentUser!.followers}
                  </p>
                </div>
                <span className={`${notoSerif.className} text-gray-300 text-sm font-medium group-hover:text-white transition-colors duration-300`}>
                  Followers
                </span>
              </div>

              {/* Following Stat */}
              <div className="md:flex md:gap-x-3 group cursor-pointer transition-all duration-300 hover:transform hover:scale-105">
                <div className="relative">
                  <p className="text-white text-lg font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text ">
                    {currentUser!.following}
                  </p>
                </div>
                <span className={`${notoSerif.className} text-gray-300 text-sm font-medium group-hover:text-white transition-colors duration-300`}>
                  Following
                </span>
              </div>

              {/* Floating Particles Effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 left-4 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-60"></div>
                <div className="absolute top-8 right-8 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-40 animation-delay-200"></div>
                <div className="absolute bottom-4 left-1/2 w-1 h-1 bg-pink-400 rounded-full animate-pulse opacity-50 animation-delay-400"></div>
              </div>
            </div>
          </div>
        </div>

        <SignOutButton />
      </div>

      <div className="bg-black flex items-center justify-center">
        {/* Modal Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            
          >
            {/* Modal Content */}
            <div
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 
                       rounded-2xl p-8 w-full max-w-md transform transition-all duration-300 
                       scale-100 shadow-2xl shadow-purple-500/20"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 
                               bg-clip-text text-transparent">
                    Edit Profile
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">Update your profile information</p>
                </div>
                <button
                  onClick={closeModal}
                  type="button"
                  className="text-gray-400 hover:text-white transition-all duration-200 
                           hover:bg-gray-700 rounded-full p-2 hover:rotate-90"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Image Section */}
              <div className="text-center mb-6">
                <div className="relative inline-block group">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 
                               flex items-center justify-center text-white text-2xl cursor-pointer
                               transition-all duration-300 group-hover:scale-105 
                               group-hover:shadow-lg group-hover:shadow-purple-500/30 border-4 border-gray-700">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User2 size={32} />
                    )}
                  </div>

                  {/* Camera Icon Overlay */}
                  <label
                    htmlFor="profilePhoto"
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-600 
                             rounded-full p-2 cursor-pointer transition-all duration-300 
                             hover:scale-110 border-2 border-gray-900 shadow-lg"
                  >
                    <Camera size={16} className="text-white" />
                  </label>
                  <input
                    type="file"
                    id="profilePhoto"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Username Input */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"

                    value={username}
                    onChange={handleUsernameChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl 
                           text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your username"
                    minLength={3}
                    maxLength={30}
                    required
                  />
                  {showUserLabel && (
                    <label className="text-red-500">This username is already taken.</label>
                  )}
                </div>

                {/* File Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Photo
                  </label>
                  <label
                    htmlFor="profilePhotoUpload"
                    className="flex flex-col items-center justify-center w-full h-24 
                           border-2 border-dashed border-gray-600 rounded-xl cursor-pointer 
                           hover:border-blue-500 hover:bg-gray-800/30 transition-all duration-300"
                  >
                    <div className="flex flex-col items-center justify-center pt-2 pb-3">
                      <svg
                        className="w-6 h-6 mb-2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-xs text-gray-400">
                        {selectedFile ? selectedFile.name : 'Click to upload new photo'}
                      </p>
                    </div>
                  </label>
                  <input
                    type="file"
                    id="profilePhotoUpload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: JPG, PNG, GIF (Max 5MB)
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 px-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 
                           hover:text-white rounded-xl transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e)=>{handleSubmit(e)}}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 
                           hover:from-blue-600 hover:to-purple-700 text-white rounded-xl 
                           transition-all duration-300 font-medium transform hover:scale-[1.02] 
                           hover:shadow-lg hover:shadow-blue-500/25"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1">
      <Post setNumberOfPosts={setNumberOfPosts} currentUser={currentUser} clerkId={clerkId} />
        </div>
    </div>
 
      )
    }
    </>
  )
  
}