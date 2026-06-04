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
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-semibold text-sm">Menyambungkan ke Supabase...</div>
  }

  return <>{children}</>
}
