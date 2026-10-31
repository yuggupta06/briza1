import Image from 'next/image';
import Link from 'next/link';

export default function BottomNavigation() {
  return (
    <>
    {/* <div className='h-15 md:hidden'></div> */}
    <div className='flex justify-between items-center w-screen fixed bg-black bottom-0 h-15  left-0 py-5 px-7 md:hidden z-50 border-t border-b border-gray-200 border-b-black '>
      <Link prefetch={true} href="/"><Image src="/images/home.png" alt="Home" width={22} height={22} /> </Link>
      <Link prefetch={true} href="/search"><Image src="/images/search.png" alt="Search" width={22} height={22} /></Link>
      <Link prefetch={true} href="/upload"><Image src="/images/upload.png" alt="Upload" width={22} height={22} /></Link>
      <Link prefetch={true} href="/profile"><Image src="/images/profile-image.png" alt="Profile" width={22} height={22} /></Link>
    </div>
    </>
  )
}
