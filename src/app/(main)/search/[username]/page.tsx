"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import Image from "next/image"
import User from "@/app/components/User/otherUsers/user"
import React from "react"
import { UserType } from "@/types/user"

export default function Users({ params }: { params: Promise<{ username: string }> }) {
    const { username } = React.use(params)
    const [searchUser, setSearchUser] = useState<UserType | null>(null)
    const [userFound, setUserFound] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const resBody = await axios.post("/api/search/users", username)
                if (resBody.data.status == 202) {
                    setSearchUser(resBody.data.searchUser)
                    setUserFound(true)
                }
                setLoading(false)
            } catch (error) {
                console.error("User not found.", error)
                setLoading(false)
            }
        }
        fetchUser()
    }, [username])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[85vh] md:h-screen">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
            </div>
        )
    }

    if (userFound && searchUser) {
        return (
            <>
                <div className="flex justify-between items-center md:hidden w-full p-5">
                    <Image src="/images/back-button.png" alt="Messages" width={20} height={20} />
                    <Image src="/images/three-dots.png" alt="Messages" width={20} height={20} />
                </div>
                <User searchUser={searchUser} />
            </>
        )
    }

    return (
        <div className="flex h-[90vh] md:h-full justify-center items-center">
            <h1 className="text-center"> “This profile isn’t available. The user may have been removed or never existed.”</h1>
        </div>
    )
}