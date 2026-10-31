"use client"

import type { ChatMessage, ChatProps } from "@/types/types";
import { Phone, Video, Send, Smile, ArrowLeft, Camera } from "lucide-react";
import { useEffect, useRef } from 'react';

export default function MobileChatView({ selectedUser, message, setMessage, handleSendMessage, messages, profileName, handleBackClick }: ChatProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
        setMessage('')
    }, [selectedUser, setMessage])

    useEffect(() => {
        // Smooth scroll to bottom whenever messages change
        const scrollToBottom = () => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        };
        
        // Small delay to ensure DOM is updated
        const timeoutId = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeoutId);
    }, [messages]);

    return (
        <div className="flex flex-col h-screen bg-transparent">
            {/* Mobile Chat Header - Fixed to prevent any overlap */}
            <div className="flex-shrink-0 overflow-y-hidden p-4 border-b border-gray-700/50 flex items-center space-x-3 shadow-sm backdrop-blur-md bg-white/5">
                <button
                    onClick={handleBackClick}
                    className="p-2 hover:bg-white/10 rounded-full -ml-2 backdrop-blur-sm"
                    aria-label="Go back to allUsers"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 via-red-400 to-orange-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {selectedUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    {selectedUser?.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black/50 rounded-full shadow-lg shadow-green-400/50"></div>
                    )}
                </div>
                <div className="flex-1">
                    <h2 className="font-semibold text-base text-white">{selectedUser?.name}</h2>
                    <p className="text-xs text-gray-300">
                        {selectedUser?.online ? 'Active now' : 'Active 2h ago'}
                    </p>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        className="p-2 hover:bg-white/10 rounded-full backdrop-blur-sm"
                        aria-label="Voice call"
                    >
                        <Phone className="w-5 h-5 text-gray-300 hover:text-blue-400" />
                    </button>
                    <button
                        className="p-2 hover:bg-white/10 rounded-full backdrop-blur-sm"
                        aria-label="Video call"
                    >
                        <Video className="w-5 h-5 text-gray-300 hover:text-blue-400" />
                    </button>
                </div>
            </div>

            {/* Mobile Messages - Properly contained between header and input */}
            <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
                style={{ 
                    minHeight: 0, // Important: allows flex item to shrink below content size
                    maxHeight: 'calc(100vh - 88px - 100px)', // Screen height minus header and input heights
                }}
            >
                { messages && messages.length > 0 ? (
                    messages.map((msg: ChatMessage, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender === profileName ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs px-4 py-3 rounded-2xl backdrop-blur-lg shadow-lg ${msg.sender === profileName
                                    ? 'bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white shadow-blue-500/20'
                                    : 'bg-white/10 text-white border border-gray-600/30 shadow-white/5'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed">{msg.message}</p>
                                <p className={`text-xs mt-2 ${msg.sender === profileName ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {new Date(msg.sendAt).toLocaleTimeString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                    })}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                )}
                {/* Scroll anchor */}
                <div ref={bottomRef} className="h-1" />
            </div>

            {/* Mobile Input - Fixed at bottom with proper z-index */}
            <div className="flex-shrink-0 fixed bottom-[75px] left-0 right-0 z-20 p-4 backdrop-blur-md bg-white/5 border-t border-gray-700/50">
                <div className="flex items-center space-x-2">
                    <button
                        className="p-2 hover:bg-white/10 rounded-full backdrop-blur-sm"
                        aria-label="Attach photo"
                    >
                        <Camera className="w-5 h-5 text-gray-300 hover:text-blue-400" />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Message..."
                            className="w-full px-4 py-3 pr-12 border border-gray-600/30 rounded-full backdrop-blur-md bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:bg-white/20 focus:border-blue-400/50 transition-all"
                        />
                        <button
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            aria-label="Add emoji"
                        >
                            <Smile className="w-5 h-5 text-gray-300 hover:text-yellow-400" />
                        </button>
                    </div>
                    <button
                        onClick={handleSendMessage}
                        className={`p-3 rounded-full transition-all backdrop-blur-lg ${message.trim()
                            ? 'bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transform hover:scale-105'
                            : 'bg-white/10 text-gray-400'
                            }`}
                        disabled={!message.trim()}
                        aria-label="Send message"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}