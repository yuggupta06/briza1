"use client"
import {notoSerif} from "@/app/fonts";
import Image from "next/image";
import ImagesFeed from "@/app/components/ImagesFeed/imagesFeed";
import Link from "next/link";


export default function HomePage() {
  return (
    <div className="w-full " >
      <div className="flex justify-between items-center md:hidden w-full p-5">
        <h1 className={`${notoSerif.className} text-white text-lg`}>Briza</h1>
        <Link href="/messages">
        <Image src="/images/messages.png" alt="Messages" width={25} height={25} />
        </Link>
      </div>
      <ImagesFeed />
    </div>
  )
}
