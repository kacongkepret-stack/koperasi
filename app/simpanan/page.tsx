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

  const isAdmin = user?.role === "admin"
  const myData = members.find(m => m.nik === user?.nik)

  const handleDeleteTransaction = async (tx: any) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini? Saldo anggota akan dikurangi sesuai nominal transaksi.")) return
    
    if (tx.member_id) {
      const { setSaldoAwal } = useMemberStore.getState()
      const member = members.find(m => m.id === tx.member_id)
      if (member) {
        const newWajib = tx.tipe === "SIMPANAN_WAJIB" ? member.saldo_wajib - tx.nominal : member.saldo_wajib
        await setSaldoAwal(member.id, member.saldo_pokok, newWajib, member.saldo_shu || 0)
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
            {isAdmin ? "Riwayat Simpanan Wajib" : "Riwayat Simpanan Wajib Saya"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? "Pantau semua history potongan simpanan wajib anggota yang diproses bulanan." : "Rincian potongan simpanan wajib dari payroll Anda."}
          </p>
        </div>
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
                {isAdmin ? `Total Koperasi (Simpanan Wajib)` : `Saldo Wajib Saya`}
              </p>
              <h2 className="text-3xl font-bold tracking-tight">
                {isAdmin 
                  ? formatRupiah(members.reduce((a, b) => a + b.saldo_wajib, 0))
                  : formatRupiah(myData?.saldo_wajib || 0)
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
              {transactions.filter(t => t.tipe === 'SIMPANAN_WAJIB').length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">Belum ada riwayat tercatat.</div>
              ) : transactions.filter(t => t.tipe === 'SIMPANAN_WAJIB')
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


    </div>
  )
}
