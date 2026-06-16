"use client"

import { useState } from "react"
import { useSettingsStore } from "@/store/settingsStore"
import { formatRupiah } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, Plus, Trash2, KeyRound } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useLoanStore } from "@/store/loanStore"
import { useMemberStore } from "@/store/memberStore"
import { supabase } from "@/lib/supabase"

type TabType = "profil" | "departemen" | "pengeluaran" | "operasional" | "historis" | "keamanan"

export default function PengaturanPage() {
  const { user } = useAuthStore()
  const { processAllInstallments, loans } = useLoanStore()
  const { processAllSimpananWajib, members } = useMemberStore()
  const { 
    companyName, simpananWajibBulanan, bungaPinjaman, saldoAwalSistem, modalPerusahaan,
    setCompanyName, setSimpananWajibBulanan, setBungaPinjaman, setSaldoAwalSistem, setModalPerusahaan,
    departments, addDepartment, removeDepartment, expenses, addExpense, 
    lastPostedSimpananMonth, lastPostedCicilanMonth, setLastPostedSimpananMonth, setLastPostedCicilanMonth,
    historicalLaba, setHistoricalLaba 
  } = useSettingsStore()
  
  const [activeTab, setActiveTab] = useState<TabType>("profil")
  
  const [tempName, setTempName] = useState(companyName)
  const [tempWajib, setTempWajib] = useState(simpananWajibBulanan)
  const [tempBunga, setTempBunga] = useState(bungaPinjaman)
  const [tempAwal, setTempAwal] = useState(saldoAwalSistem)
  const [tempModal, setTempModal] = useState(modalPerusahaan || 0)
  const [newDept, setNewDept] = useState("")
  const [expenseForm, setExpenseForm] = useState({ keterangan: "", nominal: 0 })
  const [isSaved, setIsSaved] = useState(false)

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  if (user?.role !== "admin") {
    return <div className="flex h-full items-center justify-center p-10 text-slate-500">Akses ditolak. Hanya untuk Admin.</div>
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setCompanyName(tempName)
    setSimpananWajibBulanan(tempWajib)
    setBungaPinjaman(tempBunga)
    setSaldoAwalSistem(tempAwal)
    setModalPerusahaan(tempModal)
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

      <div className="bg-white/60 p-1 rounded-lg inline-flex flex-wrap gap-1 border border-slate-200/60 shadow-sm backdrop-blur-md">
        {(["profil", "departemen", "pengeluaran", "operasional", "historis", "keamanan"] as TabType[]).map((tab) => (
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
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Sisa Uang Tunai Bulan Lalu (Rp)</label>
                    <input 
                      type="number" 
                      value={tempAwal}
                      onChange={e => setTempAwal(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Sisa kas fisik sebelum menggunakan aplikasi ini.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Suntikan Modal Perusahaan (Rp)</label>
                    <input 
                      type="number" 
                      value={tempModal}
                      onChange={e => setTempModal(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Tambahan dana dari perusahaan (jika ada).</p>
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
                        <p className="text-[10px] text-slate-500">{exp.tanggal} • {exp.id}</p>
                      </div>
                      <div className="text-xs font-bold text-rose-600">
                        - {formatRupiah(exp.nominal)}
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && <div className="p-8 text-center text-xs text-slate-500">Belum ada data pengeluaran.</div>}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "operasional" && (
            <Card>
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  Proses Bulanan Massal
                  <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px]">Tindakan Berbahaya</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Setoran Wajib Bulanan</h3>
                  <p className="text-xs text-slate-500 mb-4">Proses potong gaji/tambah saldo simpanan wajib untuk seluruh anggota aktif.</p>
                  <button 
                    onClick={() => {
                      const currentMonth = new Date().toISOString().slice(0, 7)
                      if (lastPostedSimpananMonth === currentMonth) {
                        return alert("Gagal: Simpanan wajib untuk bulan ini SUDAH diproses sebelumnya!")
                      }
                      
                      const activeMembersCount = members.filter(m => m.status === 'Aktif').length
                      if (activeMembersCount === 0) return alert("Tidak ada anggota aktif.")
                      
                      if (confirm(`Apakah Anda yakin akan memproses simpanan wajib (Rp ${simpananWajibBulanan.toLocaleString('id-ID')}) untuk semua ${activeMembersCount} anggota aktif bulan ini?`)) {
                        processAllSimpananWajib(simpananWajibBulanan)
                        setLastPostedSimpananMonth(currentMonth)
                        alert("Setoran Wajib bulan ini berhasil ditambahkan ke saldo anggota!")
                      }
                    }}
                    className="w-full sm:w-auto bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-teal-700 shadow-sm transition-all"
                  >
                    Proses Setoran Wajib ({formatRupiah(simpananWajibBulanan)})
                  </button>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Cicilan Pinjaman Bulanan</h3>
                  <p className="text-xs text-slate-500 mb-4">Proses penagihan/potong saldo cicilan pinjaman bagi anggota yang memiliki pinjaman aktif.</p>
                  <button 
                    onClick={() => {
                      const currentMonth = new Date().toISOString().slice(0, 7)
                      if (lastPostedCicilanMonth === currentMonth) {
                        return alert("Gagal: Cicilan pinjaman untuk bulan ini SUDAH diproses sebelumnya!")
                      }
                      
                      const activeLoansCount = loans.filter(l => l.status === "Approved").length
                      if (activeLoansCount === 0) return alert("Tidak ada pinjaman aktif untuk diproses.")
                      
                      if (confirm(`Apakah Anda yakin akan memotong saldo / menagih cicilan pinjaman untuk ${activeLoansCount} anggota yang memiliki pinjaman aktif bulan ini?`)) {
                        processAllInstallments()
                        setLastPostedCicilanMonth(currentMonth)
                        alert("Semua cicilan pinjaman bulan ini berhasil diproses!")
                      }
                    }}
                    className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    Proses Cicilan Pinjaman
                  </button>
                </div>

              </CardContent>
            </Card>
          )}

          {activeTab === "historis" && (
            <Card>
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Data Historis Laba Bunga (Tahun {new Date().getFullYear()})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 text-xs text-slate-500">
                  Masukkan data laba (Pendapatan Bunga Pinjaman) untuk bulan-bulan sebelum Anda menggunakan sistem ini (misal: Januari - Mei). Data ini akan dipakai untuk menyempurnakan kalkulasi tabel Rugi Laba 12 Bulan dan Laba Bersih Tahunan.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"].map(bulan => (
                    <div key={bulan} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">{bulan}</label>
                      <input 
                        type="number" 
                        value={historicalLaba[bulan] || ""}
                        onChange={(e) => setHistoricalLaba(bulan, Number(e.target.value))}
                        placeholder={`Laba ${bulan}`}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "keamanan" && (
            <Card>
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound size={16} className="text-slate-700" />
                  Keamanan Akun
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleGantiPassword} className="space-y-4 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Password Lama</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Password Baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPasswordLoading}
                      className="bg-slate-900 text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isPasswordLoading ? "Menyimpan..." : "Simpan Password Baru"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}