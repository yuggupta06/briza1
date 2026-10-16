"use client"

import {notoSerif} from "@/app/fonts";
import Image from "next/image";
import ImagesFeed from "@/app/components/ImagesFeed/imagesFeed";
import Link from "next/link";
import SideBar from "@/app/components/Headers/SideBar";
import BottomNavigation from "@/app/components/Headers/bottomNavigation";


export default function HomePage() {
  return (
    <div className="min-h-screen w-full">
      <SideBar />
      <div className="min-h-screen w-full md:pl-64">
        <header className="flex w-full items-center justify-between border-b border-white/10 px-5 py-4 md:hidden">
          <h1 className={`${notoSerif.className} text-lg tracking-[0.18em] text-[#78e6c8]`}>
            BRIZA
          </h1>
          <Link
            href="/messages"
            aria-label="Open messages"
            className="rounded-full p-2 transition-colors hover:bg-white/10"
          >
            <Image src="/images/messages.png" alt="" width={24} height={24} />
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-[760px] flex-col px-0 py-4 pb-24 sm:px-4 md:py-10">
          <h2 className="sr-only">Briza home feed</h2>
          <ImagesFeed />
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}
