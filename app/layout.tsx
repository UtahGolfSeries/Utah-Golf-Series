import { AuthProvider } from "./context/AuthContext"
import Header from "./components/header" // 1. Import your new Header
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Utah Golf Series", // 2. Updated title for your project
  description: "Official Member Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <Header /> 
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}