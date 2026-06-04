"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useSettingsStore } from "@/store/settingsStore"
import { Building, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const { companyName } = useSettingsStore()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Check Super Admin Bypass
    if (username.toUpperCase() === "ADMIN" && password === "admin123") {
      login("ADMIN", "admin", "Super Administrator")
      router.push("/")
      return
    }

    // Verify member in database
    const { data, error } = await supabase.from('members').select('*').eq('nik', username.toLowerCase()).single()
    
    if (data && !error) {
      // Check database password (fallback to 123456 if undefined, just in case old rows lack it)
      const validPassword = data.password || "123456"
      if (password === validPassword) {
        login(data.nik, "member", data.nama)
        router.push("/")
      } else {
        alert("Password salah! (Hint: gunakan password default: 123456)")
        setIsLoading(false)
      }
    } else {
      alert("Username tidak ditemukan atau Anda tidak memiliki akses!")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-transparent flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-6 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo */}
        <div className="flex flex-col items-center justify-center space-y-3 mb-6">
          <div className="shrink-0 flex items-center justify-center h-16 w-16 mb-2">
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{companyName}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Sistem Manajemen Finansial Internal</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Masuk ke Sistem</h2>
              <p className="text-xs text-slate-500">Gunakan kredensial Anda untuk melanjutkan.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Username / Alias
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: nyoman@hotel atau ADMIN"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Kata Sandi
                    </label>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    Lanjutkan <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
          <div className="bg-slate-50/50 border-t border-slate-100 p-4 text-center">
            <p className="text-[10px] text-slate-500 font-medium">
              Akses & peran Anda akan ditentukan otomatis oleh sistem.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
