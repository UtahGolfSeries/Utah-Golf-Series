import { AuthProvider } from "./context/AuthContext"
import Header from "./components/header"
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from './components/footer'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Utah Golf Series",
  description: "Official Member Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Added flex styles to the body to handle the "Sticky Footer" logic */}
      <body 
        className={`${geistSans.variable} ${geistMono.variable}`}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh', 
          margin: 0 
        }}
      >
        <AuthProvider>
          <Header /> 
          
          {/* flex: 1 tells the main content to grow and push the footer down */}
          <main style={{ flex: 1 }}>
            {children}
          </main>

          {/* 3. Added the Footer here! */}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}