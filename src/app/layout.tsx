import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar/Sidebar";
import MobileNav from "@/components/MobileNav/MobileNav";
import { NotificationProvider } from "@/context/NotificationContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VillaManager - Hệ thống Quản lý Villa Cao cấp",
  description: "Quản lý lịch đặt, giá thuê và cọc chuyên nghiệp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} antialiased`}>
        <div className="flex flex-col xl:flex-row">
          <Sidebar />
          <MobileNav />
          <main className="flex-1 xl:ml-64 min-h-screen p-4 md:p-8 pb-24 xl:pb-8 bg-[#f8fafc] text-gray-900 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto">
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
