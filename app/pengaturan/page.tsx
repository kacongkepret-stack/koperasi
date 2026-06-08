"use client"

import { useState } from "react"
import { useSettingsStore } from "@/store/settingsStore"
import { formatRupiah } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, Plus, Trash2, KeyRound } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useLoanStore } from "@/store/loanStore"
import { useMemberStore } from "@/store/memberStore"
import { supabase } from "@/lib/supabase" // Wajib import supabase

// Menambahkan "keamanan" ke dalam tipe Tab
type TabType = "profil" | "departemen" | "pengeluaran" | "operasional" | "keamanan"

export default function PengaturanPage() {
  const { user } = useAuthStore()
  const { processAllInstallments, loans } = useLoanStore()
  const { processAllSimpananWajib, members } = useMemberStore()
  const { 
    companyName, simpananWajibBulanan, bungaPinjaman, saldoBantuan, 
    setCompanyName, setSimpananWajibBulanan, setBungaPinjaman, setSaldoBantuan, 
    departments, addDepartment, removeDepartment, expenses, addExpense, 
    lastPostedSimpananMonth, lastPostedCicilanMonth, setLastPostedSimpananMonth, setLastPostedCicilanMonth 
  } = useSettingsStore()
  
  const [activeTab, setActiveTab] = useState<TabType>("profil")
  
  // Local state for forms
  const [tempName, setTempName] = useState(companyName)
  const [tempWajib, setTempWajib] = useState(simpananWajibBulanan)
  const [tempBunga, setTempBunga] = useState(bungaPinjaman)
  const [tempBantuan, setTempBantuan] = useState(saldoBantuan)
  const [newDept, setNewDept] = useState("")
  const [expenseForm, setExpenseForm] = useState({ keterangan: "", nominal: 0 })
  const [isSaved, setIsSaved] = useState(false)

  // Local state for Password Form
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  // Block non-admins
  if (user?.role !== "admin") {
    return <div className="flex h-full items-center justify-center p-10 text-slate-500">Akses ditolak. Hanya untuk Admin.</div>
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setCompanyName(tempName)
    setSimpananWajibBulanan(tempWajib)
    setBungaPinjaman(tempBunga)
    setSaldoBantuan(tempBantuan)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault()
    if (newDept && !departments.includes(newDept)) {
      addDepartment(newDept)
      setNewDept("")
    }
  }

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (expenseForm.keterangan && expenseForm.nominal > 0) {
      addExpense(expenseForm)
      setExpenseForm({ keterangan: "", nominal: 0 })
    }
  }

  // Fungsi khusus Ganti Password
  const handleGantiPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      alert("Error: Password baru dan konfirmasi tidak cocok!")
      return
    }

    if (!user?.nik) {
      alert("Error: Sesi login tidak valid. Silakan relogin.")
      return
    }

    setIsPasswordLoading(true)

    try {
      const { data, error } = await supabase
        .from('members')
        .select('password')
        .eq('nik', user.nik)
        .single()

      if (error || !data) {
        alert("Terjadi kesalahan saat memverifikasi akun Anda.")
        setIsPasswordLoading(false)
        return
      }

      const currentPassword = data.password || "123456" 
      if (oldPassword !== currentPassword) {
        alert("Error: Password lama yang Anda masukkan salah!")
        setIsPasswordLoading(false)
        return
      }

      const { error: updateError } = await supabase
        .from('members')
        .update({ password: newPassword })
        .eq('nik', user.nik)

      if (updateError) {
        alert("Gagal memperbarui password di database.")
      } else {
        alert("SUKSES: Password berhasil diperbarui!")
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err) {
      console.error("Kesalahan sistem:", err)
      alert("Terjadi kesalahan internal server.")
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Pengaturan Sistem</h1>
        <p className="text-xs text-slate-500 mt-0.5">Konfigurasi master data, profil perusahaan, dan operasional.</p>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white/60 p-1 rounded-lg inline-flex flex-wrap gap-1 border border-slate-200/60 shadow-sm backdrop-blur-md">
        {(["profil", "departemen", "pengeluaran", "operasional", "keamanan"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize ${
              activeTab === tab 
                ? "bg-slate-900 text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="col-span-1 lg:col-span-2">
          {/* TAB: PROFIL */}
          {activeTab === "profil" && (
            <Card>
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-sm font-semibold">Profil Perusahaan</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Nama Perusahaan / Koperasi</label>
                    <input 
                      type="text" 
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Potongan Simpanan Wajib / Bulan</label>
                    <input 
                      type="number" 
                      value={tempWajib}
                      onChange={e => setTempWajib(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Persentase Bunga Pinjaman (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={tempBunga}
                      onChange={e => setTempBunga(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Modal Awal / Bantuan Perusahaan (Rp)</label>
                    <input 
                      type="number" 
                      value={tempBantuan}
                      onChange={e => setTempBantuan(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                  </div>
                  <div className="pt-2">
                    <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-emerald-700 flex items-center gap-2">
                      <Save size={14} /> {isSaved ? "Tersimpan!" : "Simpan Perubahan"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB: DEPARTEMEN */}
          {activeTab === "departemen" && (
            <Card>
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-sm font-semibold">Master Departemen</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddDept} className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    placeholder="Nama Departemen Baru"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                  />
                  <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-800">
                    Tambah
                  </button>
                </form>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {departments.map(dept => (
                    <div key={dept} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="text-xs font-medium text-slate-700">{dept}</span>
                      <button onClick={() => removeDepartment(dept)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB: PENGELUARAN */}
          {activeTab === "pengeluaran" && (
            <Card>
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  Pengeluaran Operasional Koperasi
                  <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px]">Dicatat sbg Beban</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      required
                      value={expenseForm.keterangan}
                      onChange={e => setExpenseForm({...expenseForm, keterangan: e.target.value})}
                      placeholder="Keterangan (Makan, ATK, dll)"
                      className="flex-[2] px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    />
                    <input 
                      type="number" 
                      required
                      value={expenseForm.nominal || ""}
                      onChange={e => setExpenseForm({...expenseForm, nominal: Number(e.target.value)})}
                      placeholder="Nominal"
                      className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    />
                    <button type="submit" className="bg-slate-900 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-slate-800 flex items-center justify-center gap-1">
                      <Plus size={14} /> Catat
                    </button>
                  </form>
                </div>
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-auto">
                  {expenses.map(exp => (
                    <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{exp.keterangan}</p>
                        <p className="