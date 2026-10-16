export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
      <html lang="en">
        <body
          className={`  bg-gray-100 antialiased overflow-x-hidden `}
        >
          {/* <CircleCursor /> */}
          <div className="flex min-h-screen ">
            <main className="flex flex-col flex-1  pb-5 md:pb-0 ">
              {children}
            </main>
          </div>
        </body>
      </html>
  );
}
