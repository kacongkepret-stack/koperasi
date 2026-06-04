"use client"

import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useUIStore } from "@/store/uiStore"

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { toggleMobileMenu } = useUIStore()

  if (pathname === "/login") return null

  return (
    <header className="md:hidden h-14 bg-transparent flex items-center justify-between z-30 mb-2">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Menu size={20} />
        </button>

      </div>
      
      <div className="flex items-center gap-4">
        {/* We can place other header actions here in the future if needed */}
      </div>
    </header>
  )
}
