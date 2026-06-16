"use client"

import { useState } from "react"
import { useMemberStore, Anggota } from "@/store/memberStore"
import { formatRupiah, cn } from "@/lib/utils"
import { Search, Filter, MoreHorizontal, Briefcase, Calendar, Plus, X } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useSettingsStore } from "@/store/settingsStore"

export default function AnggotaPage() {
  const { members, addMember, setSaldoAwal } = useMemberStore()
  const { user } = useAuthStore()
  const { departments } = useSettingsStore()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDept, setSelectedDept] = useState("Semua")
  const [selectedUser, setSelectedUser] = useState<Anggota | null>(null)
  const [isAddMode, setIsAddMode] = useState(false)
  const [isEditSaldoMode, setIsEditSaldoMode] = useState(false)
  const [isBagiShuMode, setIsBagiShuMode] = useState(false)
  const [saldoForm, setSaldoForm] = useState({ pokok: 0, wajib: 0, shu: 0 })
  const [shuForm, setShuForm] = useState({ totalHak: 0, dicairkan: 0 })

  // Form states
  const [formData, setFormData] = useState({
    nik: "",
    nama: "",
    departemen: "F&B",
    status: "Aktif" as "Aktif" | "Inaktif"
  })

  const filterDepartments = ["Semua", ...Array.from(new Set(members.map(a => a.departemen)))]

  const filteredData = members.filter(anggota => {
    const matchesSearch = anggota.nama.toLowerCase().includes(searchTerm.toLowerCase()) || anggota.nik.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = selectedDept === "Semua" || anggota.departemen === selectedDept
    return matchesSearch && matchesDept
  })

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    addMember(formData)
    setIsAddMode(false)
    setFormData({ nik: "", nama: "", departemen: "F&B",  status: "Aktif" })
  }

  // Member role restriction (just in case they navigate here)
  if (user?.role === "member") {
    return (
      <div className="flex items-center justify-center h-full p-10 text-slate-500">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 relative flex h-[calc(100vh-6rem)] flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Database Anggota</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola data karyawan yang terdaftar sebagai anggota.</p>
        </div>
        <button 
          onClick={() => setIsAddMode(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-md text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} /> Tambah Anggota
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col flex-1">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-3 bg-slate-50/50 shrink-0">
          <div className="relative w-full sm:max-w-xs group">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Cari Username atau Nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
            />
          </div>
          
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-1 shrink-0" />
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all whitespace-nowrap border",
                  selectedDept === dept 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-auto flex-1 relative text-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3">Username / Alias</th>
                <th className="px-4 py-3">Nama Anggota</th>
                <th className="px-4 py-3">Departemen</th>
                
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredData.map((anggota) => (
                <tr 
                  key={anggota.id} 
                  className={cn(
                    "hover:bg-slate-50/80 transition-colors group cursor-pointer",
                    selectedUser?.id === anggota.id && "bg-emerald-50/50 hover:bg-emerald-50/80"
                  )}
                  onClick={() => {
                    setSelectedUser(anggota)
                    setIsAddMode(false)
                  }}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-600 text-xs">{anggota.nik}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors text-xs">{anggota.nama}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {anggota.departemen}
                    </span>
                  </td>
                  
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold",
                      anggota.status === "Aktif" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-slate-100 text-slate-600"
                    )}>
                      {anggota.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded hover:bg-emerald-50">
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                    Tidak ada data anggota.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sheet / Drawer (Detail & Form) */}
      {(selectedUser || isAddMode) && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => {
              setSelectedUser(null)
              setIsAddMode(false)
            }}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900">
                {isAddMode ? "Tambah Anggota Baru" : "Detail Anggota"}
              </h2>
              <button 
                onClick={() => {
                  setSelectedUser(null)
                  setIsAddMode(false)
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              
              {isAddMode ? (
                // Add Member Form
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Username / Alias</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.nik}
                      onChange={e => setFormData({...formData, nik: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all" 
                      placeholder="contoh: nyoman@hotel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Nama Lengkap</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.nama}
                      onChange={e => setFormData({...formData, nama: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all" 
                      placeholder="Masukkan nama"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Departemen</label>
                    <select 
                      value={formData.departemen}
                      onChange={e => setFormData({...formData, departemen: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                    >
                      <option value="">Pilih Departemen...</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors">
                      Simpan Data
                    </button>
                  </div>
                </form>
              ) : selectedUser ? (
                // View Member Details
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg font-bold border border-slate-200">
                      {selectedUser.nama.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{selectedUser.nama}</h3>
                      <p className="text-[11px] text-slate-500 font-medium">{selectedUser.nik}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Briefcase size={12} /> Departemen</div>
                      <div className="text-xs font-semibold text-slate-900">{selectedUser.departemen}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Bergabung Sejak</div>
                      <div className="text-xs font-semibold text-slate-900">{new Date(selectedUser.bergabung_sejak).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Informasi Finansial</h4>
                      <div className="flex gap-2">
                        {user?.role === "admin" && (
                          <button 
                            onClick={() => {
                              setShuForm({ totalHak: 0, dicairkan: 0 })
                              setIsBagiShuMode(true)
                            }}
                            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded transition-colors"
                          >
                            Bagikan SHU
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setSaldoForm({ pokok: selectedUser.saldo_pokok, wajib: selectedUser.saldo_wajib, shu: selectedUser.saldo_shu || 0 })
                            setIsEditSaldoMode(true)
                          }}
                          className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                        >
                          Edit Saldo Awal
                        </button>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                      <div className="p-3 flex justify-between items-center text-xs">
                        <span className="text-slate-600">Simpanan Pokok</span>
                        <span className="font-bold text-slate-900">{formatRupiah(selectedUser.saldo_pokok)}</span>
                      </div>
                      <div className="p-3 flex justify-between items-center text-xs">
                        <span className="text-slate-600">Simpanan Wajib</span>
                        <span className="font-bold text-slate-900">{formatRupiah(selectedUser.saldo_wajib)}</span>
                      </div>
                      <div className="p-3 flex justify-between items-center text-xs">
                        <span className="text-slate-600">Saldo SHU</span>
                        <span className="font-bold text-slate-900">{formatRupiah(selectedUser.saldo_shu || 0)}</span>
                      </div>
                      <div className="p-3 flex justify-between items-center text-xs bg-slate-50/50">
                        <span className="text-slate-600 font-semibold">Total Saldo</span>
                        <span className="font-bold text-emerald-600">{formatRupiah(selectedUser.saldo_pokok + selectedUser.saldo_wajib + (selectedUser.saldo_shu || 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

            </div>
          </div>
          
          {/* Edit Saldo Awal Modal */}
          {isEditSaldoMode && selectedUser && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Set Saldo Awal</h2>
                    <p className="text-[10px] text-slate-500">{selectedUser.nama} ({selectedUser.nik})</p>
                  </div>
                  <button 
                    onClick={() => setIsEditSaldoMode(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault()
                  setSaldoAwal(selectedUser.id, saldoForm.pokok, saldoForm.wajib, saldoForm.shu)
                  setSelectedUser({...selectedUser, saldo_pokok: saldoForm.pokok, saldo_wajib: saldoForm.wajib, saldo_shu: saldoForm.shu})
                  setIsEditSaldoMode(false)
                }}>
                  <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 uppercase">Simpanan Pokok</label>
                      <input 
                        type="number" 
                        value={saldoForm.pokok || ""}
                        onChange={e => setSaldoForm({...saldoForm, pokok: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 uppercase">Simpanan Wajib</label>
                      <input 
                        type="number" 
                        value={saldoForm.wajib || ""}
                        onChange={e => setSaldoForm({...saldoForm, wajib: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 uppercase">Saldo SHU Tahun Lalu</label>
                      <input 
                        type="number" 
                        value={saldoForm.shu || ""}
                        onChange={e => setSaldoForm({...saldoForm, shu: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                    <button type="button" onClick={() => setIsEditSaldoMode(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200">
                      Batal
                    </button>
                    <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                      Simpan Saldo
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Bagikan SHU Modal */}
          {isBagiShuMode && selectedUser && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Pembagian SHU Tahunan</h2>
                    <p className="text-[10px] text-slate-500">{selectedUser.nama} ({selectedUser.nik})</p>
                  </div>
                  <button 
                    onClick={() => setIsBagiShuMode(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  if (shuForm.dicairkan > shuForm.totalHak) {
                    return alert("Yang dicairkan tidak boleh lebih besar dari total hak SHU!")
                  }
                  
                  const shuDisimpan = shuForm.totalHak - shuForm.dicairkan
                  const newSaldoShu = (selectedUser.saldo_shu || 0) + shuDisimpan

                  // Update member balance
                  await setSaldoAwal(selectedUser.id, selectedUser.saldo_pokok, selectedUser.saldo_wajib, newSaldoShu)
                  
                  // Add transaction for cash disbursed
                  if (shuForm.dicairkan > 0) {
                    const { addTransaction } = useTransactionStore.getState()
                    await addTransaction({
                      member_id: selectedUser.id,
                      tipe: "PENCAIRAN_SHU",
                      nominal: shuForm.dicairkan,
                      keterangan: `Pencairan Tunai SHU ${selectedUser.nama}`
                    })
                  }

                  setSelectedUser({...selectedUser, saldo_shu: newSaldoShu})
                  setIsBagiShuMode(false)
                  alert("SHU berhasil dibagikan!")
                }}>
                  <div className="p-5 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Masukkan total hak SHU anggota tahun ini. Jika ada porsi yang diberikan <b>tunai/transfer</b>, masukkan di kolom pencairan. Sisanya akan otomatis ditambahkan ke Saldo SHU anggota.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 uppercase">Total Hak SHU Didapatkan</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        value={shuForm.totalHak || ""}
                        onChange={e => setShuForm({...shuForm, totalHak: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 uppercase">SHU Dicairkan (Tunai/Transfer)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        max={shuForm.totalHak}
                        value={shuForm.dicairkan || ""}
                        onChange={e => setShuForm({...shuForm, dicairkan: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-rose-200 bg-rose-50 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 text-rose-900" 
                      />
                    </div>
                    
                    <div className="h-px bg-slate-200 my-2"></div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-semibold">Sisa Masuk Saldo SHU:</span>
                      <span className="font-bold text-emerald-600">{formatRupiah(shuForm.totalHak - shuForm.dicairkan)}</span>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                    <button type="button" onClick={() => setIsBagiShuMode(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200">
                      Batal
                    </button>
                    <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                      Simpan Pembagian
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  )
}
