"use client"
import { useState, useRef } from "react"
import axios from "axios"
import Image from "next/image";
import {notoSerif} from "@/app/fonts";
import Link from "next/link";

// import Loading from "../frontend/components/Loading/loading";
// import UserType from "@/types";
export default function SearchBar() {
    const [searchValue, setSearchValue] = useState("");
    // const [searchUsers, setSearchUsers] = useState<UserType []>([]);
    const [searchSectionLoading, setSearchSectionLoading] = useState(false)
    const controllerRef = useRef<AbortController | null>(null)

    const searchClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchSectionLoading(true);
        setSearchValue(value);
        if (controllerRef.current) {
            controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();
        try {
            if (value == "") {
                setSearchSectionLoading(false);
                setSearchUsers([]);
                return;
            }
            const resBody = await axios.post(
                "/api/search/search-users",
                { searchValue: e.target.value },
                { signal: controllerRef.current.signal }

            )
            setSearchUsers(resBody.data.users);
            setSearchSectionLoading(false);
        }
        catch (error) {
            if (!axios.isCancel(error))  {
                console.error("Error in searching:", error);
            }
        }
    }
    if(!isLoaded){
        return(
            <Loading />
        )
    }



    return (
        <>
            <div className="flex justify-between items-center md:hidden w-full p-5">
                <h1 className={`${notoSerif.className} text-white text-lg`}>MYGRAM</h1>
            </div>
            {isSignedIn ? (

                <div className="flex flex-col items-start md:items-center pt-5 px-5 h-screen w-full md:pt-20 ">
                    <SignOutButton />
                    <input
                        className="border-2 border-amber-50 rounded-xl w-full md:w-1/2 px-2 py-1"
                        type="text"
                        placeholder="Search"
                        value={searchValue}
                        onChange={(e) => searchClick(e)}
                    />
                    {searchSectionLoading ? (
                        <div className="flex items-center justify-center w-full h-[70vh]">
                            <div className="w-12 h-12 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
                        </div>


                    ) : (
                        <>
                            {
                                searchValue != "" && !searchSectionLoading && (searchUsers.length === 0) ? (
                                    <div className="flex h-[90vh] md:h-full justify-center items-center">
                                        <h1 className="text-center text-white"> “This profile isn’t available. The user may have been removed or never existed.”</h1>
                                    </div>
                                ) : (
                                    <div className="w-1/2 p-5">
                                        {
                                            searchUsers
                                                .map((user: UserType, index) => {
                                                    return (
                                                        <div key={index} className="py-2 md:w-1/2 ">
                                                            <Link prefetch={true} className=" flex gap-x-4" href={`/search/${user.username}`}>
                                                                <Image  priority className="rounded-full " src={user?.imageUrl} alt={`User${index}`} width={45} height={45} />
                                                                <p className={`${notoSerif.className} text-white text-sm mt-2 md:text-lg `} >{user.username}</p>
                                                            </Link>
                                                        </div>
                                                    )
                                                })
                                        }
                                    </div>
                                )
                            }
                        </>
                    )
                    }

                </div>
            ) :
                <div className="flex h-[80vh] md:h-full md:w-full items-center justify-center relative">
                    <h1 className="text-center text-white text-lg md:text-2xl font-bold px-3">Please Sign in first in the profile Page..</h1>
                </div>

            }
        </>

    )
}