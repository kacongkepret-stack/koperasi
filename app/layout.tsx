import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Initializer } from "@/components/Initializer"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import AuthGuard from "@/components/layout/AuthGuard"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Koperasi Karyawan Hotel | Dashboard",
  description: "Web Dashboard Koperasi Karyawan Hotel premium",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen bg-slate-50 relative`}>
        {/* Background Premium Grid Pattern */}
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-[-1]"></div>
        
        <Initializer>
          <AuthGuard>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
                <Header />
                <div className="mt-6 h-[calc(100vh-8rem)]">
                  {children}
                </div>
              </main>
            </div>
          </AuthGuard>
        </Initializer>
      </body>
    </html>
  )
}
