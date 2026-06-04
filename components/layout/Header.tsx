"use client"

import { usePathname } from "next/navigation"
import { Bell, Search, Menu } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useUIStore } from "@/store/uiStore"

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { toggleMobileMenu } = useUIStore()

  if (pathname === "/login") return null

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Menu size={20} />
        </button>
        {user?.role === "admin" && (
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md leading-5 bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
              placeholder="Cari anggota, transaksi..."
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  )
}
