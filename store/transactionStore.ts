import { create } from "zustand"
import { supabase } from "@/lib/supabase"

export type Transaction = {
  id: string
  member_id: string | null
  tipe: "SIMPANAN_POKOK" | "SIMPANAN_WAJIB" | "CICILAN_PINJAMAN" | "PENCAIRAN_PINJAMAN" | "PELUNASAN_PINJAMAN"
  nominal: number
  keterangan: string
  created_at: string
}

interface TransactionState {
  transactions: Transaction[]
  init: () => Promise<void>
  addTransaction: (tx: Omit<Transaction, "id" | "created_at">) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  init: async () => {
    const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false })
    if (data && !error) {
      set({ transactions: data })
    }
  },
  addTransaction: async (tx) => {
    const { data, error } = await supabase.from('transactions').insert([tx]).select().single()
    if (data && !error) {
      set((state) => ({ transactions: [data, ...state.transactions] }))
    }
  },
  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) }))
    }
  }
}))
