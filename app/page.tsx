"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRupiah, cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Wallet, Users, CreditCard, PiggyBank, CheckCircle } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useLoanStore } from "@/store/loanStore"
import { useMemberStore } from "@/store/memberStore"

export default function Dashboard() {
  const { user } = useAuthStore()
  const { companyName, simpananWajibBulanan, saldoBantuan, lastPostedSimpananMonth, lastPostedCicilanMonth, setLastPostedSimpananMonth, setLastPostedCicilanMonth } = useSettingsStore()
  const { processAllInstallments, loans } = useLoanStore()
  const { processAllSimpananWajib, members } = useMemberStore()

  if (user?.role === "member") {
    return <MemberDashboard />
  }

  const simpananTerkumpul = members.reduce((a, b) => a + b.saldo_pokok + b.saldo_wajib, 0)
  const pinjamanAktif = loans.filter(l => l.status === "Approved").reduce((a, l) => a + l.nominal, 0)
  const totalAset = simpananTerkumpul + pinjamanAktif + saldoBantuan
  
  const estimasiSimpananWajibBulanan = simpananWajibBulanan * members.length
  const estimasiCicilanPinjamanBulanan = loans.filter(l => l.status === "Approved").reduce((a, l) => a + (l.nominal / l.tenor), 0)

  const recentLoansList = [...loans].sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5)
  
  const chartDataComputed = [
    { name: "Maret", masuk: simpananTerkumpul * 0.15, keluar: pinjamanAktif * 0.1 },
    { name: "April", masuk: simpananTerkumpul * 0.2, keluar: pinjamanAktif * 0.15 },
    { name: "Mei", masuk: simpananTerkumpul * 0.35, keluar: pinjamanAktif * 0.3 },
    { name: "Juni", masuk: simpananTerkumpul * 0.3, keluar: pinjamanAktif * 0.45 },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="text-xs text-slate-500 mt-0.5">Ringkasan performa finansial {companyName} bulan ini.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Aset (Estimasi)" 
          value={totalAset} 
          trend={10.5} 
          icon={Wallet} 
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100/50"
        />
        <StatCard 
          title="Pinjaman Aktif" 
          value={pinjamanAktif} 
          trend={-2.1} 
          icon={CreditCard} 
          iconColor="text-blue-600"
          iconBg="bg-blue-100/50"
        />
        <StatCard 
          title="Simpanan Terkumpul" 
          value={simpananTerkumpul} 
          trend={5.4} 
          icon={Users} 
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100/50"
        />
        <StatCard 
          title="Estimasi Total SHU" 
          value={totalAset * 0.08} 
          trend={12.5} 
          icon={PiggyBank} 
          iconColor="text-amber-600"
          iconBg="bg-amber-100/50"
        />
      </div>

      {/* Bento Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Bulk Actions (Penerimaan Finance) */}
        <Card className="col-span-1 lg:col-span-3 shadow-sm border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50/50">
          <CardHeader className="border-b border-emerald-100/50 py-3">
            <CardTitle className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              Penerimaan Potongan Gaji (Finance) Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm text-center md:text-left">
              <div>
                <p className="text-emerald-700/80 text-xs font-medium">Estimasi Cicilan Pinjaman</p>
                <p className="font-bold text-emerald-900">{formatRupiah(estimasiCicilanPinjamanBulanan)}</p>
              </div>
              <div className="w-px h-8 bg-emerald-200"></div>
              <div>
                <p className="text-emerald-700/80 text-xs font-medium">Estimasi Simpanan Wajib</p>
                <p className="font-bold text-emerald-900">{formatRupiah(estimasiSimpananWajibBulanan)}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
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
                className="flex-1 md:flex-none bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-all"
              >
                Proses Cicilan Pinjaman
              </button>
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
                className="flex-1 md:flex-none bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-teal-700 shadow-sm transition-all"
              >
                Proses Setoran Wajib
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Chart Area */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200/60 overflow-hidden group">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 py-3">
            <CardTitle className="text-sm font-semibold">Arus Kas Masuk & Keluar</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[250px] flex items-center justify-center text-slate-400">
            {/* Placeholder for Recharts. */}
            <div className="flex flex-col items-center gap-2 w-full h-full">
              <div className="w-full flex items-end gap-1.5 h-full pt-4">
                {chartDataComputed.map((d, i) => (
                  <div key={i} className="flex flex-col gap-1 items-center flex-1 h-full justify-end">
                    <div className="flex gap-1 w-full justify-center items-end h-[80%]">
                      <div className="w-1/2 bg-emerald-400/80 rounded-t-sm transition-all group-hover:bg-emerald-500" style={{ height: `${Math.max(5, (d.masuk / Math.max(totalAset, 1000000)) * 100)}%` }}></div>
                      <div className="w-1/2 bg-rose-400/80 rounded-t-sm transition-all group-hover:bg-rose-500" style={{ height: `${Math.max(5, (d.keluar / Math.max(totalAset, 1000000)) * 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-500">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Loans */}
        <Card className="col-span-1 shadow-sm border-slate-200/60 flex flex-col">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 py-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              Pengajuan Terbaru
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md cursor-pointer hover:bg-emerald-100 transition-colors border border-emerald-100">Lihat Semua</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <div className="divide-y divide-slate-100">
              {recentLoansList.map((loan) => (
                <div key={loan.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">{loan.nama}</span>
                    <span className="text-[11px] font-medium text-slate-500">{formatRupiah(loan.nominal)}</span>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                    loan.status === "Pending" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  )}>
                    {loan.status}
                  </div>
                </div>
              ))}
              {recentLoansList.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">Belum ada pengajuan pinjaman.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { useState } from "react"

function MemberDashboard() {
  const { user } = useAuthStore()
  const { simpananWajibBulanan } = useSettingsStore()
  const { loans } = useLoanStore()
  const { members, changePassword } = useMemberStore()
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  
  // Find member's active loan and balance
  const myLoan = loans.find(l => l.nama === user?.nama && l.status === "Approved")
  const myMemberData = members.find(m => m.nik === user?.nik)

  // Global Koperasi Stats
  const globalSimpanan = members.reduce((acc, m) => acc + (m.saldo_pokok + m.saldo_wajib), 0)
  const globalPinjaman = loans.filter(l => l.status === "Approved").reduce((acc, l) => acc + l.nominal, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-sm border border-emerald-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Selamat Datang, {user?.nama}</h1>
          <p className="text-emerald-100 text-xs mt-1">Username: {user?.nik} • Ini adalah ringkasan akun koperasi Anda.</p>
        </div>
        <button 
          onClick={() => setIsPasswordModalOpen(true)}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all"
        >
          Ganti Password
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200/60 hover:border-emerald-200 transition-colors">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 py-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><Wallet size={16} className="text-emerald-600" /> Total Simpanan Saya</span>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Est. SHU: {formatRupiah(1250000)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{formatRupiah((myMemberData?.saldo_pokok || 0) + (myMemberData?.saldo_wajib || 0))}</div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Simpanan Pokok</span>
                <span className="font-semibold text-slate-900">{formatRupiah(myMemberData?.saldo_pokok || 0)}</span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div>
                <span className="text-slate-500 block mb-0.5">Simpanan Wajib</span>
                <span className="font-semibold text-slate-900">{formatRupiah(myMemberData?.saldo_wajib || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200/60 hover:border-emerald-200 transition-colors">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-600" />
              Status Pinjaman
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {myLoan ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatRupiah(myLoan.nominal)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Total Pinjaman Pokok</div>
                  </div>
                  <div className="bg-amber-50 text-amber-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-100">
                    Sisa {myLoan.tenor - myLoan.cicilan_ke} Bulan
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Progress Pembayaran ({Math.round((myLoan.cicilan_ke / myLoan.tenor) * 100)}%)</span>
                    <span className="text-slate-900">Ke-{myLoan.cicilan_ke} dari {myLoan.tenor}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(myLoan.cicilan_ke / myLoan.tenor) * 100}%` }}></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-4 text-slate-400">
                <CheckCircle size={32} className="mb-2 text-emerald-500/50" />
                <p className="text-sm font-medium text-slate-600">Tidak ada pinjaman aktif.</p>
                <p className="text-xs">Keuangan Anda sehat!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Transparency Widget */}
      <div className="pt-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          Transparansi Koperasi
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Simpanan Koperasi</p>
              <p className="font-bold text-slate-900">{formatRupiah(globalSimpanan)}</p>
            </div>
            <Users size={18} className="text-slate-300" />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Uang Beredar (Pinjaman)</p>
              <p className="font-bold text-emerald-600">{formatRupiah(globalPinjaman)}</p>
            </div>
            <ArrowUpRight size={18} className="text-slate-300" />
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Ganti Password</h2>
                <p className="text-[10px] text-slate-500">Ganti password default Anda</p>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!myMemberData) return
              const success = await changePassword(myMemberData.id, newPassword)
              if (success) {
                alert("Password berhasil diubah!")
                setIsPasswordModalOpen(false)
                setNewPassword("")
              } else {
                alert("Gagal mengubah password. Silakan coba lagi.")
              }
            }}>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Password Baru</label>
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    placeholder="Minimal 6 karakter"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200">
                  Batal
                </button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  trend, 
  isPercentage, 
  trendInverted,
  icon: Icon,
  iconColor,
  iconBg
}: any) {
  const isPositive = trend > 0
  const isGood = trendInverted ? !isPositive : isPositive
  
  return (
    <Card className="relative overflow-hidden group transition-all hover:border-slate-300">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="text-lg font-bold text-slate-900 tracking-tight">
              {isPercentage ? `${value}%` : formatRupiah(value)}
            </p>
          </div>
          <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-105", iconBg, iconColor)}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-3 flex items-center text-[11px]">
          <span className={cn(
            "flex items-center font-semibold gap-0.5",
            isGood ? "text-emerald-600" : "text-rose-600"
          )}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
          <span className="text-slate-400 ml-1.5">dari bulan lalu</span>
        </div>
      </CardContent>
    </Card>
  )
}
