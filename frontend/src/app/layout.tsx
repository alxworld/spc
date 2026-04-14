import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";
import ConvexClientProvider from "@/components/ConvexClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saturday Prayer Cell",
  description: "Book the Prayer Hall and stay connected with the Saturday Prayer Cell community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <ConvexClientProvider>
          {children}
          <ChatWidget />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
