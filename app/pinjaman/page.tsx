"use client"

import { useState } from "react"
import { useLoanStore } from "@/store/loanStore"
import { useAuthStore } from "@/store/authStore"
import { useMemberStore } from "@/store/memberStore"
import { formatRupiah, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X, Search } from "lucide-react"

export default function PinjamanPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  
  // Migration mode states
  const [isMigrationMode, setIsMigrationMode] = useState(false)
  const [migratedcicilan_ke, setMigratedcicilan_ke] = useState(0)

  const { amount, tenure, setAmount, setTenure, monthlyInstallment, totalPayment, loans, addLoan, addMigratedLoan, updateLoanStatus } = useLoanStore()
  const { user } = useAuthStore()
  const { members } = useMemberStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [activeTab, setActiveTab] = useState<"active" | "pending">("active")

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value))
  }

  const handleSubmitLoan = () => {
    let loanName = user?.nama || "Member"
    let memberId = user?.id || "" // You'd need user.id in authStore, but for member role we might need to look it up or pass null
    
    if (user?.role === "admin") {
      const selected = members.find(m => m.id === selectedMemberId)
      if (!selected) {
        alert("Pilih anggota terlebih dahulu!")
        return
      }
      loanName = selected.nama
      memberId = selected.id
    } else {
      // Find my own member ID if I am a member
      const me = members.find(m => m.nik === user?.nik)
      if (me) memberId = me.id
    }

    if (!memberId) {
       alert("Sistem gagal mengidentifikasi ID Anda. Coba reload halaman.")
       return
    }

    if (isMigrationMode) {
      addMigratedLoan(memberId, loanName, amount, migratedcicilan_ke)
    } else {
      addLoan(memberId, loanName, amount)
    }
    setIsModalOpen(false)
    setIsMigrationMode(false)
    setMigratedcicilan_ke(0)
  }

  const filteredLoans = loans.filter(l => {
    // Role filter
    if (user?.role === "member" && l.nama !== user.nama) return false;
    
    // Search filter
    if (searchTerm && !l.nama.toLowerCase().includes(searchTerm.toLowerCase()) && !l.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    // Tab filter
    if (activeTab === "pending" && l.status !== "Pending") return false;
    if (activeTab === "active" && l.status !== "Approved") return false;

    return true;
  })

  const handlePaymentSubmit = () => {
    alert(`Pembayaran cicilan sebesar ${formatRupiah(paymentAmount)} berhasil dicatat untuk ${selectedLoan?.nama}!`)
    setIsPaymentModalOpen(false)
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Pinjaman Karyawan</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola dan ajukan pinjaman dengan persetujuan cepat.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} /> Ajukan Pinjaman
        </button>
      </div>

      <Card className="shadow-sm border-slate-200/60 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        {user?.role === "admin" && (
          <div className="bg-slate-50/50 border-b border-slate-100 flex gap-4 px-4 pt-3">
            <button 
              onClick={() => setActiveTab("active")}
              className={cn(
                "pb-2 text-xs font-semibold border-b-2 transition-colors",
                activeTab === "active" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Pinjaman Aktif
            </button>
            <button 
              onClick={() => setActiveTab("pending")}
              className={cn(
                "pb-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
                activeTab === "pending" ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Menunggu Persetujuan
              {loans.filter(l => l.status === "Pending").length > 0 && (
                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                  {loans.filter(l => l.status === "Pending").length}
                </span>
              )}
            </button>
          </div>
        )}
        <CardHeader className="border-b border-slate-100/50 bg-white py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">{activeTab === "pending" ? "Daftar Pinjaman Pending" : "Daftar Pinjaman Aktif"}</CardTitle>
          {user?.role === "admin" && (
            <div className="relative w-full max-w-[200px] group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-emerald-500" />
              </div>
              <input
                type="text"
                placeholder="Cari ID / Nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3">ID Pinjaman</th>
                <th className="px-4 py-3">Nama Peminjam</th>
                <th className="px-4 py-3">Total Pinjaman</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLoans.map(loan => (
                <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-600 text-xs">{loan.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 text-xs group-hover:text-emerald-700 transition-colors">{loan.nama}</td>
                  <td className="px-4 py-3 text-xs">{formatRupiah(loan.nominal)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {loan.cicilan_ke} / {loan.tenor}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold border",
                      loan.status === "Pending" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1.5">
                    {loan.status === "Pending" && user?.role === "admin" && (
                      <>
                        <button 
                          onClick={() => updateLoanStatus(loan.id, "Approved")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[10px] px-2 py-1 rounded transition-colors"
                        >
                          Setujui
                        </button>
                        <button 
                          onClick={() => updateLoanStatus(loan.id, "Rejected")}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-medium text-[10px] px-2 py-1 rounded transition-colors"
                        >
                          Tolak
                        </button>
                      </>
                    )}
                    {loan.status === "Approved" && user?.role === "admin" && (
                      <button 
                        onClick={() => {
                          setSelectedLoan(loan)
                          setPaymentAmount(monthlyInstallment()) // default suggest
                          setIsPaymentModalOpen(true)
                        }}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium text-[10px] px-2 py-1 rounded transition-colors"
                      >
                        Input Bayar
                      </button>
                    )}
                    <button className="text-slate-600 hover:text-slate-800 font-medium text-[11px] transition-colors bg-slate-100 px-2 py-1 rounded">Detail</button>
                  </td>
                </tr>
              ))}
              {filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                    Tidak ada data pinjaman.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Premium Dialog/Modal implementation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Ajukan Pinjaman Baru</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Kalkulasi cicilan secara realtime</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              
              {user?.role === "admin" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Pilih Anggota</label>
                    <select 
                      value={selectedMemberId}
                      onChange={e => setSelectedMemberId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      <option value="" disabled>-- Pilih Anggota --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.nama} ({m.nik})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <input 
                      type="checkbox" 
                      id="migrationMode" 
                      checked={isMigrationMode}
                      onChange={(e) => setIsMigrationMode(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="migrationMode" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Ini adalah pinjaman berjalan (Migrasi)
                    </label>
                  </div>
                </div>
              )}

              {/* Slider Nominal */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Nominal</label>
                  <span className="text-lg font-bold text-emerald-600">{formatRupiah(amount)}</span>
                </div>
                <input 
                  type="range" 
                  min="500000" 
                  max="6000000" 
                  step="100000"
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] font-medium text-slate-400">
                  <span>Rp 500rb</span>
                  <span>Maks Rp 6 Jt</span>
                </div>
              </div>

              {/* Tenor Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tenor (Bulan)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 8, 10].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTenure(t)}
                      className={`py-1.5 rounded-md border text-xs font-semibold transition-all ${
                        tenure === t 
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" 
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {t} Bln
                    </button>
                  ))}
                </div>
              </div>

              {/* Realtime Calculation Result */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-xs text-slate-500 font-medium">Cicilan per Bulan</span>
                  <span className="text-base font-bold text-slate-900">{formatRupiah(monthlyInstallment())}</span>
                </div>
                <div className="h-px w-full bg-slate-200 relative z-10"></div>
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-xs text-slate-500 font-medium">Total Pengembalian</span>
                  <span className="text-xs font-bold text-emerald-600">{formatRupiah(totalPayment())}</span>
                </div>
              </div>

              {isMigrationMode && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Sudah cicil berapa kali?</label>
                  <input 
                    type="number" 
                    min="1"
                    max={tenure - 1}
                    value={migratedcicilan_ke}
                    onChange={e => setMigratedcicilan_ke(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                  />
                  <p className="text-[10px] text-slate-500">Maksimal: {tenure - 1} kali.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSubmitLoan}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
              >
                Ajukan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Dialog */}
      {isPaymentModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Catat Cicilan</h2>
                <p className="text-[10px] text-slate-500">{selectedLoan.nama} ({selectedLoan.id})</p>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Nominal Bayar (Custom)</label>
                <input 
                  type="number" 
                  value={paymentAmount || ""}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button onClick={() => setIsPaymentModalOpen(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200">
                Batal
              </button>
              <button onClick={handlePaymentSubmit} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                Simpan Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
