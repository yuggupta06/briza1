"use client"
// import { ChatMessage, UserType } from "@/types/types";
import { Plus, Search, Phone, Video, Info, Send, Smile, Heart } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
// import { ChatProps } from "@/types/types";


export default function DesktopView({ allUsers, selectedUser, message, setMessage, setSelectedUser, handleSendMessage, messages, setMessages, handleUserClick, profileName }: ChatProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef=useRef<HTMLInputElement>(null)
    useEffect(()=>{
        if(inputRef.current){
            inputRef.current.focus();
        }
        setMessage('')
    },[selectedUser])

    useEffect(() => {
        // Scroll to bottom whenever messages change
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    // This is for socket io connection
    return (
        <div className="flex h-screen">
            {/* Desktop Left Sidebar */}
            <div className="w-96 border-r border-gray-800 flex flex-col backdrop-blur-sm">
                <div className="p-6 backdrop-blur-md bg-white/5 border-b border-gray-700/50">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Messages
                        </h1>
                        <button
                            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                            aria-label="New message"
                        >
                            <Plus className="w-6 h-6 text-gray-400 hover:text-white" />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search allUsers"
                            className="w-full pl-12 pr-4 py-2 backdrop-blur-md bg-white/10 text-white placeholder-gray-400 rounded-2xl border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 focus:bg-white/20 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {allUsers.map((user: UserType, index: number) => (
                        <div

                            key={index}
                            onClick={() => { handleUserClick(user) }}
                            className={`flex items-center p-4 mx-1 my-2 hover:bg-white/10 rounded-2xl cursor-pointer transition-all duration-300 group backdrop-blur-sm ${selectedUser?.username === user.username ? 'bg-white/10 ring-2 ring-blue-400/30 shadow-2xl shadow-blue-500/10' : ''
                                }`}
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
                                    <h3 className="font-semibold text-white text-base truncate group-hover:text-blue-300 transition-colors">
                                        {user.name}
                                    </h3>
                                    {/* <span className="text-sm text-gray-400">{user.time}</span> */}
                                </div>
                                <div className="flex items-center justify-between">
                                    {/* <p className="text-sm text-gray-400 truncate pr-2">{user.lastMessage}</p> */}
                                    {/* {user.unread > 0 && (
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full px-2.5 py-1 ml-2 font-medium shadow-lg animate-pulse">
                      {user.unread}
                    </span>
                  )} */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedUser ? (
                    <>
                        {/* Desktop Chat Header */}
                        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between backdrop-blur-md bg-white/5">
                            <div className="flex items-center">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-gradient-to-br  rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                        {/* <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"> */}
                                <Image
                                    src={selectedUser.imageUrl}
                                    alt={`image`}
                                    width={40}
                                    height={40}
                                    className=' rounded-full'
                                />
                                {/* </div> */}
                                    </div>
                                    {selectedUser.online && (
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-black/50 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                                    )}
                                </div>
                                <div className="ml-4">
                                    <h2 className="font-bold text-lg text-white">{selectedUser.name}</h2>
                                    <p className="text-sm text-gray-400 flex items-center">
                                        <span className={`w-2 h-2 rounded-full mr-2 ${selectedUser.online ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                                        {selectedUser.online ? 'Active now' : 'Active 2h ago'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-1">
                                <button
                                    className="p-3 hover:bg-white/10 rounded-full transition-colors group backdrop-blur-sm"
                                    aria-label="Voice call"
                                >
                                    <Phone className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
                                </button>
                                <button
                                    className="p-3 hover:bg-white/10 rounded-full transition-colors group backdrop-blur-sm"
                                    aria-label="Video call"
                                >
                                    <Video className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
                                </button>
                                <button
                                    className="p-3 hover:bg-white/10 rounded-full transition-colors group backdrop-blur-sm"
                                    aria-label="Chat info"
                                >
                                    <Info className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
                                </button>
                            </div>
                        </div>

                        {/* Desktop Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {(messages?? []).map((msg: ChatMessage, index) => (
                                <div
                                    key={index}
                                    className={`flex ${msg.sender === profileName ? 'justify-end' : 'justify-start'}`}
                                // className="flex justify-start"
                                >
                                    <div
                                        className={`max-w-lg px-6 py-4 rounded-3xl backdrop-blur-lg shadow-2xl ${msg.sender === profileName
                                            ? 'bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white shadow-blue-500/20'
                                            : 'bg-white/10 text-white border border-gray-600/30 shadow-white/5'
                                            }`}
                                    // className="max-w-lg px-6 py-4 rounded-3xl backdrop-blur-lg shadow-2xl bg-white/10 text-white border border-gray-600/30 shadow-white/5"
                                    >
                                        <p className="text-sm leading-relaxed">{msg.message}</p>
                                        <p className={`text-xs mt-3 ${msg.sender === profileName ? 'text-blue-200' : 'text-gray-400'
                                            }`}>
                                            {new Date(msg.sendAt).toLocaleTimeString("en-IN", {
                                                timeZone: "Asia/Kolkata",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: true,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Desktop Input */}
                        <div className="p-6 backdrop-blur-md bg-white/5 border-t border-gray-700/50">
                            <div className="flex items-center space-x-4">
                                <button
                                    className="p-3 hover:bg-white/10 rounded-full transition-colors group backdrop-blur-sm"
                                    aria-label="Attach image"
                                >
                                    {/* <Image className="w-6 h-6 text-gray-300 group-hover:text-blue-400" /> */}
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                    ref={inputRef}
                                        type='text'
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();   // stops newline in textarea (if you use one)
                                                handleSendMessage();  // call your send function
                                            }
                                        }}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full px-6 py-3 pr-24 backdrop-blur-md bg-white/10 text-white placeholder-gray-400 rounded-3xl border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 focus:bg-white/20 transition-all"
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                                        <button
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors group backdrop-blur-sm"
                                            aria-label="Add emoji"
                                        >
                                            <Smile className="w-4 h-4 text-gray-300 group-hover:text-yellow-400" />
                                        </button>
                                        <button
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors group backdrop-blur-sm"
                                            aria-label="Add heart"
                                        >
                                            <Heart className="w-4 h-4 text-gray-300 group-hover:text-red-400" />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    className={`p-4 rounded-full transition-all duration-200 backdrop-blur-lg  ${message.trim()
                                        ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105 transform cursor-pointer'
                                        : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                        }`}
                                    disabled={!message.trim()}
                                    aria-label="Send message"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Desktop Empty State */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-lg">
                            <div className="w-40 h-40 mx-auto mb-8 bg-gradient-to-br from-blue-500/80 via-purple-500/80 to-pink-500/80 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-lg animate-pulse shadow-blue-500/20">
                                <Send className="w-20 h-20 text-white" />
                            </div>
                            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Your Messages
                            </h2>
                            <p className="text-gray-300 mb-8 text-xl leading-relaxed">
                                Send private photos and messages to friends and groups
                            </p>
                            <button className="bg-gradient-to-r from-blue-500/80 via-purple-500/80 to-pink-500/80 hover:from-blue-600/90 hover:via-purple-600/90 hover:to-pink-600/90 text-white px-10 py-4 rounded-full transition-all shadow-2xl hover:shadow-blue-500/30 font-semibold text-lg hover:scale-105 transform backdrop-blur-lg">
                                Start Messaging
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

};


