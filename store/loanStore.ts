import { create } from "zustand"
import { supabase } from "@/lib/supabase"
import { useTransactionStore } from "./transactionStore"
import { useSettingsStore } from "./settingsStore"

export type Loan = {
  id: string
  member_id: string
  nama: string // We might not have this in DB directly, but let's assume we join or just store it for simplicity in frontend
  nominal: number
  status: "Pending" | "Approved" | "Rejected"
  tenor: number
  cicilan_ke: number
  created_at?: string
}

interface LoanState {
  amount: number
  tenure: number
  loans: Loan[]
  init: () => Promise<void>
  setAmount: (amount: number) => void
  setTenure: (tenure: number) => void
  monthlyInstallment: () => number
  totalPayment: () => number
  addLoan: (member_id: string, nama: string, nominal: number) => Promise<void>
  addMigratedLoan: (member_id: string, nama: string, nominal: number, cicilan_ke: number) => Promise<void>
  updateLoanStatus: (id: string, status: "Approved" | "Rejected") => Promise<void>
  processAllInstallments: () => Promise<void>
}

export const useLoanStore = create<LoanState>((set, get) => ({
  amount: 6000000,
  tenure: 10,
  loans: [],
  init: async () => {
    // For simplicity in the UI we assume we also fetch member names, 
    // In real app we'd join: select('*, members(nama)')
    const { data, error } = await supabase.from('loans').select('*, members(nama)').order('created_at', { ascending: false })
    if (data && !error) {
      const formattedLoans = data.map((d: any) => ({
        ...d,
        nama: d.members?.nama || "Unknown"
      }))
      set({ loans: formattedLoans as Loan[] })
    }
  },
  setAmount: (amount) => set({ amount: Math.min(amount, 6000000) }),
  setTenure: (tenure) => set({ tenure: Math.min(tenure, 10) }),
  monthlyInstallment: () => {
    const { amount, tenure } = get()
    const interestRate = useSettingsStore.getState().bungaPinjaman
    if (amount === 0) return 0
    const totalInterest = amount * (interestRate / 100) * tenure
    return (amount + totalInterest) / tenure
  },
  totalPayment: () => {
    const { amount, tenure } = get()
    const interestRate = useSettingsStore.getState().bungaPinjaman
    if (amount === 0) return 0
    const totalInterest = amount * (interestRate / 100) * tenure
    return amount + totalInterest
  },
  addLoan: async (member_id, nama, nominal) => {
    const state = get()
    const { data, error } = await supabase.from('loans').insert([{
      member_id,
      nominal,
      status: "Pending",
      tenor: state.tenure,
      cicilan_ke: 0
    }]).select().single()

    if (data && !error) {
      set({ loans: [{ ...data, nama } as Loan, ...state.loans] })
    }
  },
  addMigratedLoan: async (member_id, nama, nominal, cicilan_ke) => {
    const state = get()
    const { data, error } = await supabase.from('loans').insert([{
      member_id,
      nominal,
      status: "Approved",
      tenor: state.tenure,
      cicilan_ke
    }]).select().single()

    if (data && !error) {
      set({ loans: [{ ...data, nama } as Loan, ...state.loans] })
    }
  },
  updateLoanStatus: async (id, status) => {
    const state = get()
    const { error } = await supabase.from('loans').update({ status }).eq('id', id)
    if (!error) {
      const newLoans = state.loans.map(loan => loan.id === id ? { ...loan, status } : loan)
      set({ loans: newLoans })
    } else {
      console.error("Error updating loan status:", error)
      alert("Gagal merubah status pinjaman.")
    }
  },
  processAllInstallments: async () => {
    const state = get()
    
    // Update local state first
    const newLoans = state.loans.map(loan => {
      if (loan.status === "Approved" && loan.cicilan_ke < loan.tenor) {
        return { ...loan, cicilan_ke: loan.cicilan_ke + 1 }
      }
      return loan
    })
    set({ loans: newLoans })

    // Log transaction collectively
    const activeLoans = state.loans.filter(l => l.status === "Approved" && l.cicilan_ke < l.tenor)
    const interestRate = useSettingsStore.getState().bungaPinjaman
    const totalEstimasi = activeLoans.reduce((acc, l) => {
      const totalInterest = l.nominal * (interestRate / 100) * l.tenor
      const monthly = (l.nominal + totalInterest) / l.tenor
      return acc + monthly
    }, 0)

    await useTransactionStore.getState().addTransaction({
      member_id: null,
      tipe: "CICILAN_PINJAMAN",
      nominal: totalEstimasi,
      keterangan: `Proses Massal Cicilan Pinjaman - Bulan ${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`
    })

    // In a real app we would call an RPC to increment cicilan_ke for all active loans.
  }
}))
