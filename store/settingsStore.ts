import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "@/lib/supabase"

export interface Expense {
  id: string
  keterangan: string
  nominal: number
  tanggal: string
}

interface SettingsState {
  companyName: string
  companyLogo: string
  departments: string[]
  expenses: Expense[]
  simpananWajibBulanan: number
  bungaPinjaman: number
  saldoBantuan: number
  setCompanyName: (name: string) => Promise<void>
  setCompanyLogo: (logo: string) => Promise<void>
  addDepartment: (dept: string) => void
  removeDepartment: (dept: string) => void
  addExpense: (expense: Omit<Expense, "id" | "tanggal">) => void
  setSimpananWajibBulanan: (nominal: number) => Promise<void>
  setBungaPinjaman: (nominal: number) => Promise<void>
  setSaldoBantuan: (nominal: number) => Promise<void>
  lastPostedSimpananMonth: string
  lastPostedCicilanMonth: string
  setLastPostedSimpananMonth: (month: string) => void
  setLastPostedCicilanMonth: (month: string) => void
  historicalLaba: Record<string, number>
  setHistoricalLaba: (month: string, nominal: number) => Promise<void>
  init: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      companyName: "Koperasi Hotel Nusantara",
      companyLogo: "",
      simpananWajibBulanan: 100000,
      bungaPinjaman: 1.0,
      saldoBantuan: 0,
      lastPostedSimpananMonth: "",
      lastPostedCicilanMonth: "",
      departments: ["Front Office", "Housekeeping", "HRD", "Engineering", "Finance", "F&B Service", "F&B Product", "GM", "Mice", "Security", "Sales"],
      expenses: [],
      historicalLaba: {},
  setCompanyName: async (name) => {
    const { error } = await supabase.from('settings').update({ company_name: name }).eq('id', 1)
    if (error) console.error("Error updating company name:", error)
    set({ companyName: name })
  },
  setCompanyLogo: async (logo) => {
    const { error } = await supabase.from('settings').update({ company_logo: logo }).eq('id', 1)
    if (error) console.error("Error updating company logo:", error)
    set({ companyLogo: logo })
  },
  setSimpananWajibBulanan: async (nominal) => {
    const { error } = await supabase.from('settings').update({ simpanan_wajib_bulanan: nominal }).eq('id', 1)
    if (error) console.error("Error updating simpanan wajib:", error)
    set({ simpananWajibBulanan: nominal })
  },
  setBungaPinjaman: async (nominal) => {
    const { error } = await supabase.from('settings').update({ bunga_pinjaman: nominal }).eq('id', 1)
    if (error) console.error("Error updating bunga pinjaman:", error)
    set({ bungaPinjaman: nominal })
  },
  setSaldoBantuan: async (nominal) => {
    const { error } = await supabase.from('settings').update({ saldo_bantuan: nominal }).eq('id', 1)
    if (error) console.error("Error updating saldo bantuan:", error)
    set({ saldoBantuan: nominal })
  },
  setHistoricalLaba: async (month, nominal) => {
    const currentState = get().historicalLaba
    const newState = { ...currentState, [month]: nominal }
    const { error } = await supabase.from('settings').update({ historical_laba: newState }).eq('id', 1)
    if (error) console.error("Error updating historical laba:", error)
    set({ historicalLaba: newState })
  },
  addDepartment: (dept) => set((state) => ({ departments: [...state.departments, dept] })),
  removeDepartment: (dept) => set((state) => ({ departments: state.departments.filter(d => d !== dept) })),
  addExpense: (expense) => set((state) => ({
    expenses: [...state.expenses, { ...expense, id: `EXP-${Date.now()}`, tanggal: new Date().toISOString().split('T')[0] }]
  })),
  setLastPostedSimpananMonth: (month) => set({ lastPostedSimpananMonth: month }),
  setLastPostedCicilanMonth: (month) => set({ lastPostedCicilanMonth: month }),
  init: async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
    if (data && !error) {
      set({
        companyName: data.company_name,
        companyLogo: data.company_logo || "",
        simpananWajibBulanan: Number(data.simpanan_wajib_bulanan),
        bungaPinjaman: data.bunga_pinjaman !== null && data.bunga_pinjaman !== undefined ? Number(data.bunga_pinjaman) : 1.0,
        saldoBantuan: data.saldo_bantuan ? Number(data.saldo_bantuan) : 0,
        historicalLaba: data.historical_laba || {}
      })
    }
  }
  }),
  {
    name: "koperasi-settings",
    partialize: (state) => ({ 
      departments: state.departments, 
      expenses: state.expenses,
      lastPostedSimpananMonth: state.lastPostedSimpananMonth,
      lastPostedCicilanMonth: state.lastPostedCicilanMonth
    }),
  }
))
