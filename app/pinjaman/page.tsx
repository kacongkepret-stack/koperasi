"use client"

import { useState } from "react"
import { useLoanStore } from "@/store/loanStore"
import { useAuthStore } from "@/store/authStore"
import { useMemberStore } from "@/store/memberStore"
import { formatRupiah, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X, Search, FileText, Trash2 } from "lucide-react"
import { useSettingsStore } from "@/store/settingsStore"
import jsPDF from "jspdf"

export default function PinjamanPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  
  // Migration mode states
  const [isMigrationMode, setIsMigrationMode] = useState(false)
  const [migratedcicilan_ke, setMigratedcicilan_ke] = useState(0)
  const [isZeroInterest, setIsZeroInterest] = useState(false)
  
  const [konpensasiDialog, setKonpensasiDialog] = useState<{ isOpen: boolean, newLoan: any, oldLoan: any } | null>(null)
  const [pelunasanDialog, setPelunasanDialog] = useState<{ isOpen: boolean, loan: any } | null>(null)
  const { bungaPinjaman, companyName, companyLogo } = useSettingsStore()

  const { amount, tenure, setAmount, setTenure, monthlyInstallment, totalPayment, loans, addLoan, addMigratedLoan, updateLoanStatus, approveWithKonpensasi, payoffEarly, deleteLoan } = useLoanStore()
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

    const bungaRate = isZeroInterest ? 0 : null

    if (isMigrationMode) {
      addMigratedLoan(memberId, loanName, amount, migratedcicilan_ke, bungaRate)
    } else {
      addLoan(memberId, loanName, amount, bungaRate)
    }
    setIsModalOpen(false)
    setIsMigrationMode(false)
    setIsZeroInterest(false)
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

  const handleApproveClick = (loan: any) => {
    const oldLoan = loans.find(l => l.member_id === loan.member_id && l.status === "Approved")
    if (oldLoan) {
      setKonpensasiDialog({ isOpen: true, newLoan: loan, oldLoan })
    } else {
      updateLoanStatus(loan.id, "Approved")
    }
  }

  const executeKonpensasi = async () => {
    if (!konpensasiDialog) return
    const { newLoan, oldLoan } = konpensasiDialog
    
    const pokokPerBulan = oldLoan.nominal / oldLoan.tenor
    const bungaPerBulan = oldLoan.nominal * (bungaPinjaman / 100)
    const sisaBulan = oldLoan.tenor - oldLoan.cicilan_ke
    
    // Pelunasan = Sisa Pokok + Semua Sisa Bunga
    const sisaPokok = pokokPerBulan * sisaBulan
    const totalSisaBunga = bungaPerBulan * sisaBulan
    const pelunasanAmount = sisaPokok + totalSisaBunga
    const pencairanBersih = newLoan.nominal - pelunasanAmount

    await approveWithKonpensasi(newLoan.id, oldLoan.id, sisaPokok, totalSisaBunga, bungaPerBulan)
    printBuktiPencairan(newLoan, oldLoan, pelunasanAmount, pencairanBersih)
    setKonpensasiDialog(null)
  }

  const executePelunasanTunai = async () => {
    if (!pelunasanDialog) return
    const { loan } = pelunasanDialog
    
    const rateBunga = loan.bunga_rate !== null && loan.bunga_rate !== undefined ? loan.bunga_rate : bungaPinjaman
    const pokokPerBulan = loan.nominal / loan.tenor
    const bungaPerBulan = loan.nominal * (rateBunga / 100)
    const sisaBulan = loan.tenor - loan.cicilan_ke
    
    const sisaPokok = pokokPerBulan * sisaBulan
    const totalSisaBunga = bungaPerBulan * sisaBulan
    const totalBayar = sisaPokok + totalSisaBunga

    await payoffEarly(loan.id, sisaPokok, totalSisaBunga, rateBunga)
    printBuktiPelunasanTunai(loan, sisaPokok, totalSisaBunga, totalBayar)
    setPelunasanDialog(null)
  }

  const printBuktiPencairan = (newLoan: any, oldLoan: any, pelunasanAmount: number, pencairanBersih: number) => {
    const doc = new jsPDF({ format: 'a5' })
    
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(companyName || "Koperasi Karyawan", 14, 15)
    doc.setFontSize(10)
    doc.text("BUKTI PENCAIRAN PINJAMAN (KONPENSASI)", 14, 22)
    doc.setFont("helvetica", "normal")
    doc.line(14, 25, 134, 25)
    
    doc.setFontSize(9)
    doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 32)
    doc.text(`Nama Anggota: ${newLoan.nama}`, 14, 38)
    
    doc.setFont("helvetica", "bold")
    doc.text("Rincian Pencairan:", 14, 48)
    doc.setFont("helvetica", "normal")
    doc.text(`Nominal Pinjaman Baru:`, 14, 54)
    doc.text(formatRupiah(newLoan.nominal), 134, 54, { align: "right" })
    
    doc.text(`Pelunasan Pinjaman Lama:`, 14, 60)
    doc.text(`- ${formatRupiah(pelunasanAmount)}`, 134, 60, { align: "right" })
    
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(`(Sisa ${oldLoan.tenor - oldLoan.cicilan_ke}x angsuran dari ID: ${oldLoan.id.slice(0,8)})`, 14, 65)
    doc.setTextColor(0)
    
    doc.line(14, 70, 134, 70)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Dana Bersih Diterima Tunai:", 14, 76)
    doc.text(formatRupiah(pencairanBersih), 134, 76, { align: "right" })
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("Tanda Terima,", 14, 100)
    doc.text("(..........................)", 14, 120)
    doc.text(newLoan.nama, 14, 125)
    
    doc.text("Kasir / Petugas Koperasi,", 134, 100, { align: "right" })
    doc.text("(..........................)", 134, 120, { align: "right" })
    
    doc.save(`Bukti_Pencairan_Konpensasi_${newLoan.nama}.pdf`)
  }

  const printBuktiPelunasanTunai = (loan: any, sisaPokok: number, sisaBunga: number, totalBayar: number) => {
    const doc = new jsPDF({ format: 'a5' })
    
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(companyName || "Koperasi Karyawan", 14, 15)
    doc.setFontSize(10)
    doc.text("BUKTI PELUNASAN TUNAI (DIPERCEPAT)", 14, 22)
    doc.setFont("helvetica", "normal")
    doc.line(14, 25, 134, 25)
    
    doc.setFontSize(9)
    doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 32)
    doc.text(`Nama Anggota: ${loan.nama}`, 14, 38)
    doc.text(`ID Pinjaman: ${loan.id.slice(0,8)}`, 14, 44)
    
    doc.setFont("helvetica", "bold")
    doc.text("Rincian Pelunasan:", 14, 54)
    doc.setFont("helvetica", "normal")
    
    doc.text(`Sisa Pokok Pinjaman:`, 14, 60)
    doc.text(formatRupiah(sisaPokok), 134, 60, { align: "right" })
    
    doc.text(`Sisa Bunga Pinjaman:`, 14, 66)
    doc.text(formatRupiah(sisaBunga), 134, 66, { align: "right" })
    
    doc.line(14, 71, 134, 71)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Total Dibayar Tunai:", 14, 77)
    doc.text(formatRupiah(totalBayar), 134, 77, { align: "right" })
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("Yang Menyerahkan,", 14, 100)
    doc.text("(..........................)", 14, 120)
    doc.text(loan.nama, 14, 125)
    
    doc.text("Penerima / Kasir,", 134, 100, { align: "right" })
    doc.text("(..........................)", 134, 120, { align: "right" })
    
    doc.save(`Bukti_Pelunasan_Tunai_${loan.nama}.pdf`)
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
                          onClick={() => handleApproveClick(loan)}
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
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            setPelunasanDialog({ isOpen: true, loan })
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[10px] px-2 py-1 rounded transition-colors"
                        >
                          Lunas Tunai
                        </button>
                      </div>
                    )}
                    {user?.role === "admin" && (
                      <button 
                        onClick={() => {
                          if(confirm("Apakah Anda yakin ingin menghapus pinjaman ini selamanya?")) {
                            deleteLoan(loan.id)
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 font-medium text-[11px] transition-colors bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-100 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Hapus
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
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
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
            
            <div className="p-5 space-y-6 overflow-y-auto">
              
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

              {/* Zero Interest Checkbox */}
              {user?.role === "admin" && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="zeroInterestMode" 
                      checked={isZeroInterest}
                      onChange={(e) => setIsZeroInterest(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="zeroInterestMode" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Jadikan Pinjaman Khusus (0% Bunga) untuk cicilan Saldo Awal
                    </label>
                  </div>
                </div>
              )}

              {/* Input Nominal Manual */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Nominal Pinjaman</label>
                  <span className="text-lg font-bold text-emerald-600">{formatRupiah(amount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-md border border-slate-200">Rp</span>
                  <input 
                    type="number" 
                    min="0"
                    value={amount}
                    onChange={handleAmountChange}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    placeholder="Masukkan nominal bebas"
                  />
                </div>
              </div>

              {/* Tenor Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tenor (Bulan)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[3, 5, 6, 8, 10].map((t) => (
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
                  <span className="text-base font-bold text-slate-900">
                    {formatRupiah(
                      isZeroInterest 
                      ? amount / tenure 
                      : (amount + (amount * (bungaPinjaman / 100) * tenure)) / tenure
                    )}
                  </span>
                </div>
                <div className="h-px w-full bg-slate-200 relative z-10"></div>
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-xs text-slate-500 font-medium">Total Pengembalian</span>
                  <span className="text-xs font-bold text-emerald-600">
                    {formatRupiah(
                      isZeroInterest 
                      ? amount 
                      : amount + (amount * (bungaPinjaman / 100) * tenure)
                    )}
                  </span>
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

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
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
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
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
            
            <div className="p-5 space-y-4 overflow-y-auto">
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

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
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
      
      {/* Konpensasi Dialog */}
      {konpensasiDialog && konpensasiDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Konfirmasi Konpensasi Utang</h2>
                <p className="text-[10px] text-slate-500">Anggota ini memiliki pinjaman aktif</p>
              </div>
              <button 
                onClick={() => setKonpensasiDialog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Pinjaman Baru:</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(konpensasiDialog.newLoan.nominal)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Pelunasan Lama (Sisa {konpensasiDialog.oldLoan.tenor - konpensasiDialog.oldLoan.cicilan_ke}x Pokok & Bunga):</span>
                  <span className="font-semibold">
                    -{formatRupiah(
                      ((konpensasiDialog.oldLoan.nominal / konpensasiDialog.oldLoan.tenor) + 
                      (konpensasiDialog.oldLoan.nominal * (bungaPinjaman/100))) * 
                      (konpensasiDialog.oldLoan.tenor - konpensasiDialog.oldLoan.cicilan_ke)
                    )}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Pencairan Bersih (Tunai):</span>
                  <span>
                    {formatRupiah(
                      konpensasiDialog.newLoan.nominal - 
                      (((konpensasiDialog.oldLoan.nominal / konpensasiDialog.oldLoan.tenor) + 
                      (konpensasiDialog.oldLoan.nominal * (bungaPinjaman/100))) * 
                      (konpensasiDialog.oldLoan.tenor - konpensasiDialog.oldLoan.cicilan_ke))
                    )}
                  </span>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Menyetujui akan otomatis melunaskan pinjaman lama dan mencetak bukti pencairan konpensasi.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button onClick={() => setKonpensasiDialog(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200">
                Batal
              </button>
              <button onClick={executeKonpensasi} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5">
                <FileText size={14} /> Setujui & Print Bukti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pelunasan Tunai Dialog */}
      {pelunasanDialog && pelunasanDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Konfirmasi Pelunasan Tunai</h2>
                <p className="text-[10px] text-slate-500">Anggota membayar tunai sisa pinjaman</p>
              </div>
              <button 
                onClick={() => setPelunasanDialog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Sisa Pokok ({pelunasanDialog.loan.tenor - pelunasanDialog.loan.cicilan_ke}x):</span>
                  <span className="font-semibold text-slate-900">
                    {formatRupiah((pelunasanDialog.loan.nominal / pelunasanDialog.loan.tenor) * (pelunasanDialog.loan.tenor - pelunasanDialog.loan.cicilan_ke))}
                  </span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Sisa Bunga ({pelunasanDialog.loan.bunga_rate !== null && pelunasanDialog.loan.bunga_rate !== undefined ? pelunasanDialog.loan.bunga_rate : bungaPinjaman}%):</span>
                  <span className="font-semibold">
                    {formatRupiah((pelunasanDialog.loan.nominal * ((pelunasanDialog.loan.bunga_rate !== null && pelunasanDialog.loan.bunga_rate !== undefined ? pelunasanDialog.loan.bunga_rate : bungaPinjaman)/100)) * (pelunasanDialog.loan.tenor - pelunasanDialog.loan.cicilan_ke))}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Total Dibayar Tunai:</span>
                  <span>
                    {formatRupiah(
                      ((pelunasanDialog.loan.nominal / pelunasanDialog.loan.tenor) + 
                      (pelunasanDialog.loan.nominal * ((pelunasanDialog.loan.bunga_rate !== null && pelunasanDialog.loan.bunga_rate !== undefined ? pelunasanDialog.loan.bunga_rate : bungaPinjaman)/100))) * 
                      (pelunasanDialog.loan.tenor - pelunasanDialog.loan.cicilan_ke)
                    )}
                  </span>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Menyetujui akan mengubah status pinjaman menjadi Lunas, dan mencatat pemasukan Kas sebesar nilai tunai di atas.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button onClick={() => setPelunasanDialog(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200">
                Batal
              </button>
              <button onClick={executePelunasanTunai} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5">
                <FileText size={14} /> Lunas & Print Bukti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
