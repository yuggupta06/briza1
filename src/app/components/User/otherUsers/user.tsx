"use client"
import {notoSerif} from "@/app/fonts";
import Post from "@/app/components/Posts/post";
import Image from "next/image";
import { SignOutButton, useUser } from "@clerk/nextjs";

export default function User({searchUser}:{searchUser:UserType}){
   const numberOfPosts=((searchUser.posts?? []).filter((p:{deleted:boolean})=>p.deleted!=true).length);
  
    return (

        <div className="space-y-14">
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
                  src={searchUser?.imageUrl}
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
                {searchUser.username}
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
                  {searchUser.name}
                </h1>

                {/* Verified Badge */}
                <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

            
            </div>

            {/* Enhanced Stats Section */}
            <div className="flex justify-between px-5 pt-2 md:justify-start md:items-center md:gap-x-16 relative">

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
                    {searchUser.followers}
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
                    {searchUser.following}
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

      <Post remountProfile={()=>{}}  currentUser={searchUser} />

      </div>
    )
}