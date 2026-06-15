"use client"

import { useState } from "react"
import { formatRupiah } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownToLine, Calendar, Download, Trash2 } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useMemberStore } from "@/store/memberStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useTransactionStore } from "@/store/transactionStore"

export default function SimpananPage() {
  const { user } = useAuthStore()
  const { members } = useMemberStore()
  const { simpananWajibBulanan } = useSettingsStore()
  const { transactions, addTransaction, deleteTransaction } = useTransactionStore()

  const [activeTab, setActiveTab] = useState<"pokok" | "wajib">("pokok")
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false)
  const [installmentAmount, setInstallmentAmount] = useState(100000)
  const [selectedMemberId, setSelectedMemberId] = useState("")

  const isAdmin = user?.role === "admin"
  const myData = members.find(m => m.nik === user?.nik)

  const handleDeleteTransaction = async (tx: any) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini? Saldo anggota akan dikurangi sesuai nominal transaksi.")) return
    
    if (tx.member_id) {
      const { setSaldoAwal } = useMemberStore.getState()
      const member = members.find(m => m.id === tx.member_id)
      if (member) {
        const newPokok = tx.tipe === "SIMPANAN_POKOK" ? member.saldo_pokok - tx.nominal : member.saldo_pokok
        const newWajib = tx.tipe === "SIMPANAN_WAJIB" ? member.saldo_wajib - tx.nominal : member.saldo_wajib
        await setSaldoAwal(member.id, newPokok, newWajib, member.saldo_shu || 0)
      }
    }
    await deleteTransaction(tx.id)
    alert("Transaksi berhasil dihapus!")
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isAdmin ? "Simpanan Anggota" : "Riwayat Simpanan Saya"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? "Kelola setoran pokok dan wajib semua anggota." : "Rincian potongan simpanan dari payroll Anda."}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsInstallmentModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5"
          >
            {activeTab === "pokok" ? "Input Cicilan Pokok" : "Input Simpanan Wajib"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-slate-100/50 p-1.5 rounded-xl inline-flex gap-1 border border-slate-200/60">
        <button
          onClick={() => setActiveTab("pokok")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "pokok" 
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          Simpanan Pokok
        </button>
        <button
          onClick={() => setActiveTab("wajib")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "wajib" 
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          Simpanan Wajib
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Summary */}
        <Card className="col-span-1 shadow-sm border-slate-200/60 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
          <CardContent className="p-6 space-y-4">
            <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md">
              <ArrowDownToLine size={20} className="text-white" />
            </div>
            <div>
              <p className="text-emerald-100 text-xs font-medium mb-1">
                {isAdmin ? `Total Koperasi (${activeTab === 'pokok' ? 'Pokok' : 'Wajib'})` : `Saldo ${activeTab === 'pokok' ? 'Pokok' : 'Wajib'} Saya`}
              </p>
              <h2 className="text-3xl font-bold tracking-tight">
                {isAdmin 
                  ? (activeTab === 'pokok' ? formatRupiah(members.reduce((a, b) => a + b.saldo_pokok, 0)) : formatRupiah(members.reduce((a, b) => a + b.saldo_wajib, 0)))
                  : (activeTab === 'pokok' ? formatRupiah(myData?.saldo_pokok || 0) : formatRupiah(myData?.saldo_wajib || 0))
                }
              </h2>
            </div>
            <p className="text-emerald-100 text-sm">
              {isAdmin 
                ? `*Terkumpul dari ${members.length} anggota aktif` 
                : `*Terkumpul sejak ${new Date(myData?.bergabung_sejak || "").toLocaleDateString('id-ID', { year: 'numeric' })}`
              }
            </p>
          </CardContent>
        </Card>

        {/* Timeline Riwayat */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200/60">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Riwayat Pemotongan Terakhir</CardTitle>
            <button className="text-slate-400 hover:text-emerald-600 transition-colors">
              <Download size={18} />
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {transactions.filter(t => activeTab === 'pokok' ? t.tipe === 'SIMPANAN_POKOK' : t.tipe === 'SIMPANAN_WAJIB').length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">Belum ada riwayat tercatat.</div>
              ) : transactions.filter(t => activeTab === 'pokok' ? t.tipe === 'SIMPANAN_POKOK' : t.tipe === 'SIMPANAN_WAJIB')
                 .filter(t => isAdmin || t.member_id === myData?.id || t.member_id === null)
                 .map((t, idx, arr) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 z-10 shrink-0">
                      <Calendar size={14} />
                    </div>
                    {idx !== arr.length - 1 && <div className="w-px h-full bg-slate-200 my-0.5"></div>}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex-1 hover:border-emerald-200/60 transition-colors group cursor-default">
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">{t.keterangan}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">Berhasil</span>
                        {isAdmin && (
                           <button onClick={() => handleDeleteTransaction(t)} className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded-sm hover:bg-rose-50" title="Hapus Transaksi">
                             <Trash2 size={13} />
                           </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tanggal: {new Date(t.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Nominal Transaksi</span>
                      <span className="font-bold text-slate-900">
                        {formatRupiah(t.nominal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installment Dialog */}
      {isInstallmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Catat {activeTab === "pokok" ? "Cicilan Pokok" : "Simpanan Wajib"}</h2>
                <p className="text-[10px] text-slate-500">Input transaksi manual untuk anggota</p>
              </div>
              <button 
                onClick={() => setIsInstallmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Pilih Anggota</label>
                <select 
                  value={selectedMemberId}
                  onChange={e => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Pilih Anggota...</option>
                  {members.filter(m => m.status === 'Aktif').map(m => (
                    <option key={m.id} value={m.id}>{m.nik} - {m.nama}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Nominal Setoran</label>
                <input 
                  type="number" 
                  value={installmentAmount || ""}
                  onChange={e => setInstallmentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button onClick={() => setIsInstallmentModalOpen(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200">
                Batal
              </button>
              <button onClick={async () => {
                if (!selectedMemberId) return alert("Pilih anggota terlebih dahulu!")
                if (installmentAmount <= 0) return alert("Nominal harus lebih dari 0!")

                // Use the setSaldoAwal function from memberStore to also update their actual balance
                const { setSaldoAwal } = useMemberStore.getState()
                const member = members.find(m => m.id === selectedMemberId)
                if (member) {
                  const newPokok = activeTab === "pokok" ? member.saldo_pokok + installmentAmount : member.saldo_pokok
                  const newWajib = activeTab === "wajib" ? member.saldo_wajib + installmentAmount : member.saldo_wajib
                  await setSaldoAwal(selectedMemberId, newPokok, newWajib, member.saldo_shu || 0)
                }

                await addTransaction({
                  member_id: selectedMemberId,
                  tipe: activeTab === "pokok" ? "SIMPANAN_POKOK" : "SIMPANAN_WAJIB",
                  nominal: installmentAmount,
                  keterangan: `Input Manual ${activeTab === "pokok" ? "Setoran Pokok" : "Simpanan Wajib"}`
                })
                alert(`Transaksi ${activeTab === "pokok" ? "Pokok" : "Wajib"} berhasil dicatat!`)
                setIsInstallmentModalOpen(false)
                setSelectedMemberId("")
              }} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
