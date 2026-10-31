import {notoSerif} from "@/app/fonts";
import Link from "next/link";
import Image from "next/image";


export default function SideBar() {
  return (
    <aside className="md:flex md:flex-col fixed top-0 left-0 h-screen w-64 px-5 py-8 hidden border-r border-white/10 bg-[#0d111a]/85 backdrop-blur-xl overflow-y-hidden">
      <div className="mb-12 px-4">
        <p className={`${notoSerif.className} text-3xl tracking-[0.18em] text-[#78e6c8]`}>BRIZA</p>
        <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">A quieter social space</p>
      </div>
      <nav aria-label="Primary navigation" className="flex flex-col gap-2">
        {[
            { href: "/", icon: "/images/home.png", label: "Home" },
            { href: "/search", icon: "/images/search.png", label: "Search" },
            { href: "/upload", icon: "/images/upload.png", label: "Upload" },
            { href: "/profile", icon: "/images/profile-image.png", label: "Profile" },
            { href: "/messages", icon: "/images/message.png", label: "Messages" },
        ].map(({ href, icon, label }) => (
            <Link
            prefetch={true}
            key={href}
            href={href}
            className={`flex items-center gap-x-3 md:text-2xl  lg:text-xl  xl:text-[1.1rem] text-white rounded-lg transition-all duration-200 px-5 py-3 hover:bg-white/10 hover:scale-[1.02] ${notoSerif.className}`}
            >
            <Image src={icon} alt={label} width={25} height={25} />
            {label}
            </Link>
        ))}
      </nav>
    </aside>
  );
}
