import { create } from "zustand"
import { supabase } from "@/lib/supabase"
import { useTransactionStore } from "./transactionStore"

export type Anggota = {
  id: string
  nik: string
  nama: string
  departemen: string
  status: "Aktif" | "Inaktif"
  bergabung_sejak: string
  saldo_pokok: number
  saldo_wajib: number
  saldo_shu: number
}

interface MemberState {
  members: Anggota[]
  init: () => Promise<void>
  addMember: (member: Omit<Anggota, "id" | "bergabung_sejak" | "saldo_pokok" | "saldo_wajib" | "saldo_shu">) => Promise<void>
  setSaldoAwal: (id: string, pokok: number, wajib: number, shu: number) => Promise<void>
  processAllSimpananWajib: (nominalBulanan: number) => Promise<void>
  changePassword: (id: string, newPassword: string) => Promise<boolean>
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  init: async () => {
    const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    if (data && !error) {
      set({ members: data as Anggota[] })
    }
  },
  addMember: async (newMember) => {
    const state = get()
    
    const { data, error } = await supabase.from('members').insert([{
      ...newMember,
      saldo_pokok: 0,
      saldo_wajib: 0,
      saldo_shu: 0,
      password: '123456'
    }]).select().single()

    if (data && !error) {
      set({ members: [data as Anggota, ...state.members] })
    } else {
      console.error("Error adding member:", error)
      alert("Gagal menambahkan anggota. Pastikan Username/Alias belum digunakan.")
    }
  },
  setSaldoAwal: async (id, pokok, wajib, shu) => {
    const { error } = await supabase.from('members').update({ saldo_pokok: pokok, saldo_wajib: wajib, saldo_shu: shu }).eq('id', id)
    if (!error) {
      set((state) => ({
        members: state.members.map(m => 
          m.id === id ? { ...m, saldo_pokok: pokok, saldo_wajib: wajib, saldo_shu: shu } : m
        )
      }))
    }
  },
  changePassword: async (id, newPassword) => {
    const { error } = await supabase.from('members').update({ password: newPassword }).eq('id', id)
    return !error
  },
  processAllSimpananWajib: async (nominalBulanan) => {
    const state = get()
    const activeMembers = state.members.filter(m => m.status === 'Aktif')
    
    // We update local state first for immediate UI response
    set((state) => ({
      members: state.members.map(m => 
        m.status === "Aktif" ? { ...m, saldo_wajib: m.saldo_wajib + nominalBulanan } : m
      )
    }))

    // Process all active members to update DB and log transactions
    await Promise.all(activeMembers.map(async (m) => {
      // Update DB
      await supabase.from('members')
        .update({ saldo_wajib: m.saldo_wajib + nominalBulanan })
        .eq('id', m.id)
      
      // Log individual transaction
      await useTransactionStore.getState().addTransaction({
        member_id: m.id,
        tipe: "SIMPANAN_WAJIB",
        nominal: nominalBulanan,
        keterangan: `Simpanan Wajib Bulanan`
      })
    }))
  }
}))
