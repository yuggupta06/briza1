import BottomNavigation from "./components/Headers/bottomNavigation";
import SideBar from "./components/Headers/SideBar";
import "./globals.css";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
      <html lang="en">
        <body
          className={`min-h-screen bg-[#0b0d12] text-white antialiased overflow-x-hidden`}
        >
          {/* <CircleCursor /> */}
          <div className="flex min-h-screen ">
            <div className="md:w-50 border-r-1 border-r-gray-500">
              <SideBar />
            </div>
            <main className="flex flex-col flex-1  pb-5 md:pb-0 ">
              {children}
              <BottomNavigation />
            </main>
          </div>
        </body>
      </html>

  );
}
