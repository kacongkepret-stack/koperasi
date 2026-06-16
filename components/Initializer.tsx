"use client"

import { useEffect, useState } from "react"
import { useSettingsStore } from "@/store/settingsStore"
import { useMemberStore } from "@/store/memberStore"
import { useLoanStore } from "@/store/loanStore"
import { useTransactionStore } from "@/store/transactionStore"

export function Initializer({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  
  const initSettings = useSettingsStore(state => state.init)
  const initMembers = useMemberStore(state => state.init)
  const initLoans = useLoanStore(state => state.init)
  const initTransactions = useTransactionStore(state => state.init)

  useEffect(() => {
    async function loadAll() {
      await Promise.all([
        initSettings(),
        initMembers(),
        initLoans(),
        initTransactions()
      ])
      setLoading(false)
    }
    loadAll()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="relative flex items-center justify-center w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
            <div className="absolute inset-1.5 rounded-full border-r-2 border-indigo-500 animate-[spin_1.5s_linear_infinite]"></div>
            <div className="absolute inset-3 rounded-full border-b-2 border-rose-500 animate-[spin_2s_linear_infinite]"></div>
            <div className="w-4 h-4 bg-slate-800 rounded-full animate-pulse shadow-md"></div>
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight animate-pulse">Memuat Ruang Kerja...</h2>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">Koperasi The Grand Santhi</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
