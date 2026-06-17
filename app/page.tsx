"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRupiah, cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Wallet, Users, CreditCard, PiggyBank, CheckCircle, TrendingUp, Activity } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from "@/store/authStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useLoanStore } from "@/store/loanStore"
import { useMemberStore } from "@/store/memberStore"
import { useTransactionStore } from "@/store/transactionStore"

export default function Dashboard() {
  const { user } = useAuthStore()
  const { loans } = useLoanStore()
  const { members } = useMemberStore()
  const { transactions } = useTransactionStore()
  const { companyName, saldoAwalSistem, bungaPinjaman, historicalLaba, modalPerusahaan } = useSettingsStore()

  if (user?.role === "member") {
    return <MemberDashboard />
  }

  // Calculate real SHU
  const currentMonthName = new Date().toLocaleDateString("id-ID", { month: 'long' })
  const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"]
  
  const activeLoans = loans.filter(l => l.status === "Approved")
  const currentYear = new Date().getFullYear()
  const totalLabaTahunan = BULAN_NAMES.reduce((acc, bulan) => {
    const key = `${currentYear}-${bulan}`
    return acc + (historicalLaba?.[key] || 0)
  }, 0)
  const shuBersih = totalLabaTahunan * 0.95

  const simpananTerkumpul = members.reduce((a, b) => a + b.saldo_pokok + b.saldo_wajib, 0)
  const pinjamanAktif = activeLoans.reduce((a, l) => {
    const pokokPerBulan = l.nominal / l.tenor
    const sisaHutang = pokokPerBulan * (l.tenor - l.cicilan_ke)
    return a + sisaHutang
  }, 0)
  // Total Aset = Modal (Saldo Awal + SHU) + Kewajiban (Simpanan Terkumpul)
  // Atau secara Aktiva = Saldo Kas (Uang Brankas) + Piutang (Pinjaman Aktif)
  const totalAset = simpananTerkumpul + (modalPerusahaan || 0) + shuBersih
  
  const totalAnggota = members.filter(m => m.status === "Aktif").length
  const recentLoansList = [...loans].sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5)
  
  // Mock Data for the chart for presentation purposes (in reality this would be computed historically)
  const chartData = [
    { name: "Jan", masuk: simpananTerkumpul * 0.1, keluar: pinjamanAktif * 0.05 },
    { name: "Feb", masuk: simpananTerkumpul * 0.12, keluar: pinjamanAktif * 0.08 },
    { name: "Mar", masuk: simpananTerkumpul * 0.15, keluar: pinjamanAktif * 0.1 },
    { name: "Apr", masuk: simpananTerkumpul * 0.2, keluar: pinjamanAktif * 0.15 },
    { name: "Mei", masuk: simpananTerkumpul * 0.35, keluar: pinjamanAktif * 0.3 },
    { name: "Jun", masuk: simpananTerkumpul * 0.45, keluar: pinjamanAktif * 0.4 },
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
          icon={Wallet} 
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100/50"
        />
        <StatCard 
          title="Pinjaman Aktif" 
          value={pinjamanAktif} 
          icon={CreditCard} 
          iconColor="text-blue-600"
          iconBg="bg-blue-100/50"
        />
        <StatCard 
          title="Simpanan Terkumpul" 
          value={simpananTerkumpul} 
          icon={Users} 
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100/50"
        />
        <StatCard 
          title="Estimasi Total SHU" 
          value={shuBersih} 
          icon={PiggyBank} 
          iconColor="text-amber-600"
          iconBg="bg-amber-100/50"
        />
      </div>

      {/* Bento Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200/60 overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100/50 py-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-emerald-600" />
                Tren Arus Kas (Semester 1)
              </CardTitle>
              <div className="flex gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>Pemasukan</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>Pengeluaran</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis hide={true} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatRupiah(value)}
                />
                <Area type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMasuk)" />
                <Area type="monotone" dataKey="keluar" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorKeluar)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Highlight Metrics */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Executive Summary Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 shadow-lg border border-slate-700 p-6 flex flex-col justify-between group h-full">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10 text-emerald-400 pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
              <TrendingUp size={150} strokeWidth={1} />
            </div>
            
            <div className="relative z-10 space-y-1 border-l-4 border-emerald-500 pl-4 mb-8">
              <p className="text-emerald-400 font-bold uppercase tracking-[0.1em] text-[10px]">Total Anggota Aktif</p>
              <h2 className="text-white text-3xl font-black tracking-tight">{totalAnggota} <span className="text-sm font-medium text-slate-400">Orang</span></h2>
            </div>
            
            <div className="relative z-10 text-left bg-black/20 p-4 rounded-lg border border-white/5 backdrop-blur-sm space-y-1">
              <p className="text-slate-400 text-[10px] font-bold uppercase">Proyeksi Aset Akhir Tahun</p>
              <span className="block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200 drop-shadow-sm tracking-tight">
                {formatRupiah(totalAset * 1.35)}
              </span>
            </div>
          </div>

          {/* Recent Loans */}
          <Card className="shadow-sm border-slate-200/60 flex flex-col">
            <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 py-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                Pengajuan Pinjaman Aktif
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md cursor-pointer hover:bg-emerald-100 transition-colors border border-emerald-100">Live</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-auto max-h-[170px]">
              <div className="divide-y divide-slate-100">
                {recentLoansList.map((loan) => (
                  <div key={loan.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{loan.nama}</span>
                      <span className="text-[11px] font-medium text-slate-500">{formatRupiah(loan.nominal)}</span>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold border",
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
    </div>
  )
}

import { useState } from "react"

function MemberDashboard() {
  const { user } = useAuthStore()
  const { simpananWajibBulanan, bungaPinjaman, historicalLaba, modalPerusahaan } = useSettingsStore()
  const { loans } = useLoanStore()
  const { members, changePassword } = useMemberStore()
  
  const currentMonthName = new Date().toLocaleDateString("id-ID", { month: 'long' })
  const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"]
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  
  // Find member's active loan and balance
  const myLoan = loans.find(l => l.nama === user?.nama && l.status === "Approved")
  const myMemberData = members.find(m => m.nik === user?.nik)

  // Global Koperasi Stats
  const globalSimpananTerkumpul = members.reduce((acc, m) => acc + m.saldo_pokok + m.saldo_wajib, 0)
  const globalPinjaman = loans.filter(l => l.status === "Approved").reduce((acc, l) => acc + ((l.nominal / l.tenor) * (l.tenor - l.cicilan_ke)), 0)

  // Calculate Estimasi SHU
  const activeLoans = loans.filter(l => l.status === "Approved")
  const currentYear = new Date().getFullYear()
  const totalLabaTahunan = BULAN_NAMES.reduce((acc, bulan) => {
    const key = `${currentYear}-${bulan}`
    return acc + (historicalLaba?.[key] || 0)
  }, 0)
  const shuBersih = totalLabaTahunan * 0.95
  
  const myTotalTabungan = myMemberData ? (myMemberData.saldo_pokok + myMemberData.saldo_wajib) : 0
  const myEstimasiSHU = members.length > 0 ? shuBersih / members.length : 0
  
  const globalTotalAset = globalSimpananTerkumpul + (modalPerusahaan || 0) + shuBersih

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
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Est. SHU {new Date().getFullYear()}: {formatRupiah(myEstimasiSHU)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{formatRupiah(myTotalTabungan)}</div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">SHU Lama</span>
                <span className="font-semibold text-slate-900">{formatRupiah(myMemberData?.saldo_shu || 0)}</span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div>
                <span className="text-slate-500 block mb-0.5">Total SHU (Lama+Baru)</span>
                <span className="font-bold text-blue-600">{formatRupiah((myMemberData?.saldo_shu || 0) + myEstimasiSHU)}</span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div>
                <span className="text-slate-500 block mb-0.5">Total Aset Keseluruhan</span>
                <span className="font-bold text-emerald-700">{formatRupiah(myTotalTabungan + (myMemberData?.saldo_shu || 0) + myEstimasiSHU)}</span>
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
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatRupiah((myLoan.nominal / myLoan.tenor) * (myLoan.tenor - myLoan.cicilan_ke))}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Sisa Hutang Berjalan</div>
                  </div>
                  <div className="text-right">
                    <div className="bg-amber-50 text-amber-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-100 mb-1 inline-block">
                      Sisa {myLoan.tenor - myLoan.cicilan_ke} Bulan
                    </div>
                    <div className="text-[10px] text-slate-400 block">Total Plafon: {formatRupiah(myLoan.nominal)}</div>
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
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Aset (Estimasi)</p>
              <p className="font-bold text-slate-900">{formatRupiah(globalTotalAset)}</p>
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
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
            <p className="text-xl font-black text-slate-900 tracking-tight">
              {isPercentage ? `${value.toFixed(1)}%` : formatRupiah(value)}
            </p>
          </div>
          <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-105 shrink-0", iconBg, iconColor)}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
        </div>
        {trend !== undefined && (
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
        )}
      </CardContent>
    </Card>
  )
}
