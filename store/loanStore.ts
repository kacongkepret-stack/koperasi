import { create } from "zustand"
import { supabase } from "@/lib/supabase"
import { useTransactionStore } from "./transactionStore"
import { useSettingsStore } from "./settingsStore"

export type Loan = {
  id: string
  member_id: string
  nama: string // We might not have this in DB directly, but let's assume we join or just store it for simplicity in frontend
  nominal: number
  status: "Pending" | "Approved" | "Rejected" | "Lunas"
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
  updateLoanStatus: (id: string, status: "Approved" | "Rejected" | "Lunas") => Promise<void>
  approveWithKonpensasi: (newLoanId: string, oldLoanId: string, pelunasanAmount: number) => Promise<void>
  processAllInstallments: () => Promise<void>
  deleteLoan: (id: string) => Promise<void>
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

      // Log pencairan dana
      if (status === "Approved") {
        const loan = state.loans.find(l => l.id === id)
        if (loan) {
          await useTransactionStore.getState().addTransaction({
            member_id: loan.member_id,
            tipe: "PENCAIRAN_PINJAMAN",
            nominal: loan.nominal,
            keterangan: `Pencairan Dana ${loan.nama}`
          })
        }
      }
    } else {
      console.error("Error updating loan status:", error)
      alert("Gagal merubah status pinjaman.")
    }
  },
  approveWithKonpensasi: async (newLoanId, oldLoanId, pelunasanAmount) => {
    const state = get()
    
    // 1. Mark old loan as Lunas
    const { error: err1 } = await supabase.from('loans').update({ status: 'Lunas' }).eq('id', oldLoanId)
    if (err1) {
      console.error("Error closing old loan:", err1)
      alert("Gagal menutup pinjaman lama.")
      return
    }

    // Log PELUNASAN_PINJAMAN
    const oldLoan = state.loans.find(l => l.id === oldLoanId)
    if (oldLoan) {
      await useTransactionStore.getState().addTransaction({
        member_id: oldLoan.member_id,
        tipe: "PELUNASAN_PINJAMAN",
        nominal: pelunasanAmount,
        keterangan: `Pelunasan Konpensasi ${oldLoan.nama}`
      })
    }

    // 2. Mark new loan as Approved
    const { error: err2 } = await supabase.from('loans').update({ status: 'Approved' }).eq('id', newLoanId)
    if (err2) {
      console.error("Error approving new loan:", err2)
      alert("Gagal menyetujui pinjaman baru.")
      return
    }

    // Log PENCAIRAN_PINJAMAN
    const newLoan = state.loans.find(l => l.id === newLoanId)
    if (newLoan) {
      await useTransactionStore.getState().addTransaction({
        member_id: newLoan.member_id,
        tipe: "PENCAIRAN_PINJAMAN",
        nominal: newLoan.nominal,
        keterangan: `Pencairan Dana ${newLoan.nama}`
      })
    }

    // 3. Update local state
    const newLoans = state.loans.map(loan => {
      if (loan.id === oldLoanId) return { ...loan, status: "Lunas" as const }
      if (loan.id === newLoanId) return { ...loan, status: "Approved" as const }
      return loan
    })
    set({ loans: newLoans })
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

    // Update cicilan_ke in Supabase for each active loan
    await Promise.all(
      activeLoans.map(l => 
        supabase.from('loans').update({ cicilan_ke: l.cicilan_ke + 1 }).eq('id', l.id)
      )
    )
  },
  deleteLoan: async (id) => {
    const state = get()
    const { error } = await supabase.from('loans').delete().eq('id', id)
    if (!error) {
      set({ loans: state.loans.filter(l => l.id !== id) })
    } else {
      console.error("Error deleting loan:", error)
      alert("Gagal menghapus pinjaman.")
    }
  }
}))
