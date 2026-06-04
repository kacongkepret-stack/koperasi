"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, Wallet, CreditCard, FileText, ChevronLeft, ChevronRight, Building, LogOut, Settings } from "lucide-react"
import { useUIStore } from "@/store/uiStore"
import { useAuthStore } from "@/store/authStore"
import { useSettingsStore } from "@/store/settingsStore"
import { cn } from "@/lib/utils"

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const { companyName } = useSettingsStore()

  // Conditional Navigation
  const adminNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Anggota", href: "/anggota", icon: Users },
    { name: "Simpanan", href: "/simpanan", icon: Wallet },
    { name: "Pinjaman", href: "/pinjaman", icon: CreditCard },
    { name: "Laporan", href: "/laporan", icon: FileText },
    { name: "Pengaturan", href: "/pengaturan", icon: Settings },
  ]

  const memberNavigation = [
    { name: "Dashboard Saya", href: "/", icon: LayoutDashboard },
    { name: "Histori Simpanan", href: "/simpanan", icon: Wallet },
    { name: "Detail Pinjaman", href: "/pinjaman", icon: CreditCard },
  ]

  const navigation = user?.role === "admin" ? adminNavigation : memberNavigation

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  // Do not render sidebar on login page
  if (pathname === "/login") return null

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col shrink-0 z-50",
          // Mobile specific classes
          "fixed inset-y-0 left-0 md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full w-64 md:w-auto",
          // Desktop specific classes
          "md:flex",
          isSidebarCollapsed && !isMobileMenuOpen ? "md:w-16" : "md:w-64"
        )}
      >
        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-500 z-10"
        >
          {isSidebarCollapsed && !isMobileMenuOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="shrink-0 flex items-center justify-center">
            <img src="/Logo.png" alt="Logo" className="w-9 object-contain" />
          </div>
          {(!isSidebarCollapsed || isMobileMenuOpen) && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm tracking-tight text-slate-900 leading-tight truncate">{companyName}</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">{user?.role === 'admin' ? 'Administrator' : 'Member Area'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                isActive 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <item.icon 
                size={18} 
                className={cn(
                  "transition-colors shrink-0",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                )} 
              />
              {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>
      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-100">
        <div className={cn(
          "flex items-center gap-3 rounded-md hover:bg-slate-50 p-1.5 transition-colors group cursor-pointer",
          isSidebarCollapsed && !isMobileMenuOpen ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 ring-1 ring-slate-300/50">
              {user?.nama?.charAt(0) || "U"}
            </div>
            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate">{user?.nama || "User"}</span>
                <span className="text-[10px] text-slate-500 truncate">{user?.nik || "NIK-000"}</span>
              </div>
            )}
          </div>
          {(!isSidebarCollapsed || isMobileMenuOpen) && (
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  )
}
