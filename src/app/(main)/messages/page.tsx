"use client"
import React, { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/backend/lib/socket';
import { Search, MoreHorizontal, Phone, Video, Info, Send, Heart, Smile, ArrowLeft, Plus, Camera } from 'lucide-react';
import axios from "axios";
// import { ChatMessage, UserType } from '@/types/types';
import Image from 'next/image';
import DesktopView from '@/app/components/Message_Components/desktopView';
import MobileChatView from '@/app/components/Message_Components/mobileChatView';
import { Socket } from 'socket.io-client';
let socket: Socket;
interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
};


export default function MessagesPage() {
  const [profileName, setProfileName] = useState<string>("")
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [message, setMessage] = useState<string>('');
  const [showChat, setShowChat] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);                   // all users in message chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);                // messages of the two users
  const controllerRef = useRef<AbortController | null>(null)


  useEffect(() => {
    socket = getSocket();

    const InsertandDeleteSocket = async (socketId: string | undefined) => {
      if (!socketId) return; // ignore if undefined
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      controllerRef.current = new AbortController();
      try {
        const resBody = await axios.post("/api/socket", {
          userId: user?._id ?? user?.id,
          socketId: socketId
        },
          { signal: controllerRef.current.signal }

        )
        setProfileName(resBody.data.myProfileName);
      }
      catch {
        console.error("Error in socket id insertion")
      }
    }


    if (user) {
      socket.on("Notification changed socket-id", (message) => {
        const { socketId, userId } = message
        console.log(userId)
        console.log(socketId)
        setAllUsers((prev) =>
          prev.map((p) => (p._id ?? p.id) == userId ? { ...p, socketId: socketId } : p)
        )
        console.log(allUsers)
        setSelectedUser(prev => {
          if (prev === null) return prev; // do nothing
          return {
            ...prev,
            socketId: socketId
          };
        });
      })
      socket.on("connect", () => {
        console.log("Connected with socket:", socket.id);
        InsertandDeleteSocket(socket.id);
        socket.emit("changed-socket-id", { socketId: socket.id, userId: user?._id ?? user?.id });
      });
      socket.on("received-message", (message: ChatMessage) => {
        setMessages((prev) => [...prev, message])
      })
    }
   
  }, [user])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const resBody = await axios.get("/api/all_users");
        setAllUsers(resBody.data.users)

      } catch (error) {
        console.error(error);
      }
    }
    fetchUsers()
  }, [])




  const handleUserClick = (user: UserType): void => {
    setMessages([])
    setSelectedUser(user);
    setShowChat(true);
    const fetchMessages = async () => {
      try {
        const resBody = await axios.post("/api/handleMessages", { username1: profileName, username2: user.username })
        console.log(resBody.data.messages)
        setMessages(resBody.data.messages)
      } catch (error) {
        console.error(error)
      }
    }
    fetchMessages()
  };

  const handleBackClick = (): void => {
    setShowChat(false);
    setSelectedUser(null);
  };

  const handleSendMessage = (): void => {
    if (message.trim()) {
      // Handle send message logic here
      const actualMessage: ChatMessage = {
        sender: profileName,
        message: message.trim(),
        sendAt: new Date().toISOString()
      }
      setMessages((prev) => [...prev, actualMessage])
      socket?.emit("send-message", {
        selectedUser: {
          username: selectedUser?.username,
          socketId: selectedUser?.socketId
        },
        messageFormat: actualMessage
      })
      setMessage('');
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setMessage(e.target.value)
  };

  // Mobile Chat View


  // Mobile Users List View
  const MobileUsersView = () => (
    <div className="flex flex-col h-[92vh] md:h-screen ">
      {/* Mobile Header */}
      <div className="p-4 backdrop-blur-md bg-white/5 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Messages
          </h1>
          <button
            className="p-2 hover:bg-white/10 rounded-full backdrop-blur-sm"
            aria-label="New message"
          >
            <Plus className="w-6 h-6 text-gray-300 hover:text-blue-400" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-12 pr-4 py-3 backdrop-blur-md bg-white/10 text-white placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:bg-white/20"
          />
        </div>
      </div>

      {/* Mobile Users List */}
      <div className="flex-1 overflow-y-auto">
        {allUsers.map((user: UserType, index: number) => (
          <div
            key={index}
            onClick={() => { handleUserClick(user) }}
            className="flex items-center p-4 hover:bg-white/10 active:bg-white/15 cursor-pointer transition-colors border-b border-gray-700/30 backdrop-blur-sm"
          >
            <div className="relative mr-4" >
              {/* <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"> */}
              <Image
                src={user.imageUrl}
                alt={`image-${index}`}
                width={40}
                height={40}
                className=' rounded-full'
              />
              {/* </div> */}
              {user.online && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-black/50 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-base truncate text-white">{user.name}</h3>
                {/* <span className="text-sm text-gray-300 ml-2">{user.time}</span> */}
              </div>
              <div className="flex items-center justify-between">
                {/* <p className="text-sm text-gray-300 truncate pr-2">{user.lastMessage}</p> */}
                {/* {user.unread > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {user.unread}
                  </span>
                )} */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Desktop View


  return (
    <div>
      {/* Mobile View */}
      <div className="lg:hidden">
        {showChat ? <MobileChatView
          allUsers={allUsers}
          selectedUser={selectedUser}
          message={message}
          setMessage={setMessage}
          setSelectedUser={setSelectedUser}
          handleSendMessage={handleSendMessage}
          messages={messages}
          setMessages={setMessages}
          handleUserClick={handleUserClick}
          profileName={profileName}
          handleBackClick={handleBackClick}
        /> : <MobileUsersView />}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopView
          allUsers={allUsers}
          selectedUser={selectedUser}
          message={message}
          setMessage={setMessage}
          setSelectedUser={setSelectedUser}
          handleSendMessage={handleSendMessage}
          messages={messages}
          setMessages={setMessages}
          handleUserClick={handleUserClick}
          profileName={profileName}

        />
      </div>
    </div>
  );
}