"use client"

import { useState } from "react"
import { formatRupiah, cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { FileSpreadsheet, FileText, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useMemberStore } from "@/store/memberStore"
import { useLoanStore } from "@/store/loanStore"
import { useSettingsStore } from "@/store/settingsStore"

export default function LaporanPage() {
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState({ title: "", desc: "" })
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [activeTab, setActiveTab] = useState<"peminjam" | "tabungan" | "rugilaba" | "keuangan">("peminjam")
  
  const { members } = useMemberStore()
  const { loans } = useLoanStore()
  const { simpananWajibBulanan, bungaPinjaman, companyName, companyLogo, saldoBantuan } = useSettingsStore()

  const activeLoans = loans.filter(l => l.status === "Approved")
  const currentMonthStr = new Date().toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })
  const currentDateStr = new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })

  // ----------------------------------------------------
  // DATA 1: DAFTAR PEMINJAM (POTONGAN HRD)
  // ----------------------------------------------------
  // Hanya anggota yang punya pinjaman, atau semua anggota yang dipotong? 
  // Sesuai gambar, DAFTAR PEMINJAM is members who have loans + iuran.
  const daftarPeminjam = members
    .map(member => {
      const loan = activeLoans.find(l => l.nama === member.nama)
      if (!loan) return null
      
      const pokokPerBulan = loan.nominal / loan.tenor
      const bungaPerBulan = loan.nominal * (bungaPinjaman / 100)
      const potonganPinjaman = pokokPerBulan + bungaPerBulan
      
      return {
        nama: member.nama,
        dept: member.departemen || "-",
        iuran: simpananWajibBulanan,
        potonganPinjaman: potonganPinjaman,
        totalPotongan: simpananWajibBulanan + potonganPinjaman,
        potonganKe: loan.cicilan_ke
      }
    })
    .filter(Boolean) as any[]

  const totalIuranPeminjam = daftarPeminjam.reduce((a, b) => a + b.iuran, 0)
  const totalPotonganPinjaman = daftarPeminjam.reduce((a, b) => a + b.potonganPinjaman, 0)
  const totalSemuaPotongan = daftarPeminjam.reduce((a, b) => a + b.totalPotongan, 0)

  // ----------------------------------------------------
  // DATA 2: DATA TABUNGAN (BUKU SALDO)
  // ----------------------------------------------------
  const totalSaldoPokok = members.reduce((a, b) => a + b.saldo_pokok, 0)
  const totalSaldoWajib = members.reduce((a, b) => a + b.saldo_wajib, 0)
  const totalSaldoKeseluruhan = totalSaldoPokok + totalSaldoWajib

  // ----------------------------------------------------
  // DATA 3: RUGI LABA (PENDAPATAN BUNGA)
  // ----------------------------------------------------
  const totalPendapatanBungaBulanIni = activeLoans.reduce((a, l) => {
    return a + (l.nominal * (bungaPinjaman / 100))
  }, 0)

  // ----------------------------------------------------
  // DATA 4: LAPORAN KEUANGAN (ARUS KAS)
  // ----------------------------------------------------
  const pemasukanIuranWajib = members.length * simpananWajibBulanan
  const pemasukanPokokPinjaman = activeLoans.map(l => ({
    nama: l.nama,
    dept: members.find(m => m.nama === l.nama)?.departemen || "-",
    nominal: l.nominal / l.tenor
  }))
  const totalPemasukanPokok = pemasukanPokokPinjaman.reduce((a, b) => a + b.nominal, 0)

  // Mengelompokkan bunga (Sesuai Gambar 4: Bunga 20000 -> 160000)
  const groupedBunga = activeLoans.reduce((acc, l) => {
    const bunga = l.nominal * (bungaPinjaman / 100)
    acc[bunga] = (acc[bunga] || 0) + bunga
    return acc
  }, {} as Record<number, number>)

  const totalSisaSaldoAwal = saldoBantuan
  const totalPemasukan = pemasukanIuranWajib + totalPemasukanPokok + totalPendapatanBungaBulanIni + totalSisaSaldoAwal

  // Pengeluaran (Pinjaman dicairkan)
  const pengeluaranPinjaman = activeLoans.map(l => ({
    nama: l.nama,
    nominal: l.nominal
  }))
  const totalPengeluaran = pengeluaranPinjaman.reduce((a, b) => a + b.nominal, 0)
  
  const saldoAkhir = totalPemasukan - totalPengeluaran

  // ====================================================
  // EXPORT EXCEL
  // ====================================================
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // 1. Sheet Daftar Peminjam
    const ws1Data = daftarPeminjam.map((r, i) => ({
      "NO": i + 1,
      "NAMA": r.nama,
      "DEPT": r.dept,
      [`IURAN ${currentMonthStr.toUpperCase()}`]: r.iuran,
      "POTONGAN PINJAMAN": r.potonganPinjaman,
      "TOTAL POTONGAN": r.totalPotongan,
      "POTONGAN KE": `KE ${r.potonganKe}`
    }))
    ws1Data.push({
      "NO": "" as any, "NAMA": "", "DEPT": "Total", 
      [`IURAN ${currentMonthStr.toUpperCase()}`]: totalIuranPeminjam,
      "POTONGAN PINJAMAN": totalPotonganPinjaman,
      "TOTAL POTONGAN": totalSemuaPotongan,
      "POTONGAN KE": ""
    } as any)
    const ws1 = XLSX.utils.json_to_sheet(ws1Data)
    XLSX.utils.book_append_sheet(wb, ws1, "Daftar Peminjam")

    // 2. Sheet Data Tabungan
    const ws2Data = members.map((m, i) => ({
      "NO": i + 1,
      "NAMA": m.nama,
      "DEPT": m.departemen,
      "SALDO POKOK": m.saldo_pokok,
      "SALDO WAJIB": m.saldo_wajib,
      "TOTAL TABUNGAN": m.saldo_pokok + m.saldo_wajib
    }))
    ws2Data.push({
      "NO": "" as any, "NAMA": "", "DEPT": "Total", 
      "SALDO POKOK": totalSaldoPokok,
      "SALDO WAJIB": totalSaldoWajib,
      "TOTAL TABUNGAN": totalSaldoKeseluruhan
    } as any)
    const ws2 = XLSX.utils.json_to_sheet(ws2Data)
    XLSX.utils.book_append_sheet(wb, ws2, "Data Tabungan")

    // 3. Sheet Rugi Laba
    const ws3Data = [
      { "Bulan": currentMonthStr, "Pendapatan Bunga Pinjaman": totalPendapatanBungaBulanIni },
      { "Bulan": "Jumlah", "Pendapatan Bunga Pinjaman": totalPendapatanBungaBulanIni }
    ]
    const ws3 = XLSX.utils.json_to_sheet(ws3Data)
    XLSX.utils.book_append_sheet(wb, ws3, "Rugi Laba")

    // Export file
    XLSX.writeFile(wb, "Laporan_Koperasi_Lengkap.xlsx")

    setToastMsg({ title: "Excel Berhasil Diunduh!", desc: "File Laporan_Koperasi_Lengkap.xlsx telah diexport." })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  // ====================================================
  // EXPORT PDF
  // ====================================================
  const handleExportPDF = () => {
    setIsExportingPDF(true)
    const img = new Image()
    img.src = companyLogo || "/logo.png"
    
    const generatePDF = (hasLogo = false) => {
      const doc = new jsPDF()
      
      let textStartX = 14
      if (hasLogo && img.width > 0 && img.height > 0) {
        const imgRatio = img.width / img.height
        const targetHeight = 16
        const targetWidth = targetHeight * imgRatio
        doc.addImage(img, "PNG", 14, 12, targetWidth, targetHeight)
        textStartX = 14 + targetWidth + 4 
      }
      
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(companyName || "Koperasi Karyawan", textStartX, 22)
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      
      if (activeTab === "peminjam") {
        doc.text(`DAFTAR PEMINJAM - PERIODE ${currentMonthStr.toUpperCase()}`, 14, 34)
        autoTable(doc, {
          startY: 42,
          head: [['NO', 'NAMA', 'DEPT', 'IURAN', 'POTONGAN PINJ.', 'TOTAL POTONGAN', 'KE-']],
          body: [
            ...daftarPeminjam.map((r, i) => [
              i+1, r.nama, r.dept, formatRupiah(r.iuran), formatRupiah(r.potonganPinjaman), formatRupiah(r.totalPotongan), r.potonganKe
            ]),
            ['', '', 'TOTAL', formatRupiah(totalIuranPeminjam), formatRupiah(totalPotonganPinjaman), formatRupiah(totalSemuaPotongan), '']
          ],
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1, lineColor: [203, 213, 225] },
          bodyStyles: { lineWidth: 0.1, lineColor: [203, 213, 225] },
        })
        doc.save("Daftar_Peminjam.pdf")
      } 
      else if (activeTab === "tabungan") {
        doc.text(`DATA TABUNGAN - PERIODE ${new Date().getFullYear()}`, 14, 34)
        autoTable(doc, {
          startY: 42,
          head: [['NO', 'NAMA', 'DEPT', 'SALDO POKOK', 'SALDO WAJIB', 'TOTAL']],
          body: [
            ...members.map((m, i) => [
              i+1, m.nama, m.departemen || "-", formatRupiah(m.saldo_pokok), formatRupiah(m.saldo_wajib), formatRupiah(m.saldo_pokok + m.saldo_wajib)
            ]),
            ['', '', 'TOTAL', formatRupiah(totalSaldoPokok), formatRupiah(totalSaldoWajib), formatRupiah(totalSaldoKeseluruhan)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1, lineColor: [203, 213, 225] },
          bodyStyles: { lineWidth: 0.1, lineColor: [203, 213, 225] },
        })
        doc.save("Data_Tabungan.pdf")
      }
      else if (activeTab === "rugilaba") {
        doc.text(`LAPORAN RUGI - LABA`, 14, 34)
        doc.text(`PERIODE ${new Date().getFullYear()}`, 14, 40)
        autoTable(doc, {
          startY: 46,
          head: [['Bulan', 'Pendapatan Bunga Pinjaman']],
          body: [
            [currentMonthStr, formatRupiah(totalPendapatanBungaBulanIni)],
            ['Jumlah', formatRupiah(totalPendapatanBungaBulanIni)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1, lineColor: [203, 213, 225] },
          bodyStyles: { lineWidth: 0.1, lineColor: [203, 213, 225] },
        })
        doc.save("Laporan_Rugi_Laba.pdf")
      }
      else if (activeTab === "keuangan") {
        doc.text(`LAPORAN KEUANGAN KOPERASI PER ${currentDateStr}`, 14, 34)
        
        let bodyData = []
        
        // PEMASUKAN
        bodyData.push([{ content: 'I Pemasukan', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [209, 250, 229], textColor: [6, 78, 59] } }])
        bodyData.push(['', `1 Iuran Wajib Anggota ${currentMonthStr}`, formatRupiah(pemasukanIuranWajib)])
        bodyData.push(['', { content: '2 Iuran Pinjaman :', colSpan: 2 }])
        
        pemasukanPokokPinjaman.forEach((p, i) => {
          bodyData.push(['', `${i+1} ${p.nama} (${p.dept})`, formatRupiah(p.nominal)])
        })
        
        bodyData.push(['', { content: '3 BUNGA', colSpan: 2, styles: { fontStyle: 'bold', textColor: [180, 83, 9] } }])
        Object.entries(groupedBunga).forEach(([bungaRate, total]) => {
          bodyData.push(['', `Bunga ${bungaRate}`, formatRupiah(total)])
        })
        
        bodyData.push(['', `4 Sisa Saldo Bulan Lalu`, formatRupiah(totalSisaSaldoAwal)])
        bodyData.push(['', { content: 'Total Pemasukan', styles: { fontStyle: 'bold' } }, { content: formatRupiah(totalPemasukan), styles: { fontStyle: 'bold' } }])
        
        // PENGELUARAN
        bodyData.push([{ content: 'II Pengeluaran', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [255, 228, 230], textColor: [136, 19, 55] } }])
        pengeluaranPinjaman.forEach((p, i) => {
          bodyData.push(['', `${i+1} Pinjaman ${p.nama}`, formatRupiah(p.nominal)])
        })
        
        if (pengeluaranPinjaman.length === 0) {
          bodyData.push(['', 'Tidak ada pencairan pinjaman', '-'])
        }
        
        bodyData.push(['', { content: 'Total Pengeluaran', styles: { fontStyle: 'bold' } }, { content: formatRupiah(totalPengeluaran), styles: { fontStyle: 'bold' } }])
        
        bodyData.push(['', '', ''])
        // SALDO AKHIR
        bodyData.push([
          { content: `Saldo Akhir per ${currentDateStr}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: [255, 255, 255] } }, 
          { content: formatRupiah(saldoAkhir), styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: [52, 211, 153] } }
        ])

        autoTable(doc, {
          startY: 42,
          body: bodyData as any,
          theme: 'plain',
          styles: { cellPadding: 2, fontSize: 9, lineColor: [226, 232, 240], lineWidth: 0.1 },
        })
        doc.save("Laporan_Keuangan.pdf")
      }

      setIsExportingPDF(false)
      setToastMsg({ title: "PDF Berhasil Dicetak!", desc: "File laporan resmi telah siap." })
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }

    img.onload = () => generatePDF(true)
    img.onerror = () => generatePDF(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pusat Laporan & Akuntansi</h1>
          <p className="text-slate-500 mt-1">Laporan komprehensif standar akuntansi koperasi.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 group"
          >
            <FileSpreadsheet size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            Excel
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 group"
          >
            <FileText size={18} className={isExportingPDF ? "animate-pulse" : "group-hover:scale-110 transition-transform"} />
            {isExportingPDF ? "Mencetak..." : "Export PDF"}
          </button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200/60 overflow-hidden">
        <div className="bg-slate-50/50 border-b border-slate-100 flex gap-4 px-4 pt-3 overflow-x-auto">
          {[
            { id: "peminjam", label: "Daftar Peminjam" },
            { id: "tabungan", label: "Data Tabungan" },
            { id: "rugilaba", label: "Rugi - Laba" },
            { id: "keuangan", label: "Laporan Keuangan" }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <CardContent className="p-0">
          
          {/* TAB 1: PEMINJAM */}
          {activeTab === "peminjam" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-200 text-center">NO</th>
                    <th className="px-4 py-3 border-r border-slate-200">NAMA</th>
                    <th className="px-4 py-3 border-r border-slate-200">DEPT</th>
                    <th className="px-4 py-3 border-r border-slate-200 text-right">IURAN {currentMonthStr.toUpperCase()}</th>
                    <th className="px-4 py-3 border-r border-slate-200 text-right">POTONGAN PINJAMAN</th>
                    <th className="px-4 py-3 border-r border-slate-200 text-right">TOTAL POTONGAN</th>
                    <th className="px-4 py-3 text-center">POTONGAN KE</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {daftarPeminjam.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 border-r border-slate-200 text-center font-medium">{i + 1}</td>
                      <td className="px-4 py-3 border-r border-slate-200">{r.nama}</td>
                      <td className="px-4 py-3 border-r border-slate-200">{r.dept}</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-right">{formatRupiah(r.iuran)}</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-right">{formatRupiah(r.potonganPinjaman)}</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-right font-semibold">{formatRupiah(r.totalPotongan)}</td>
                      <td className="px-4 py-3 text-center text-slate-500">KE {r.potonganKe}</td>
                    </tr>
                  ))}
                  {daftarPeminjam.length > 0 && (
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                      <td colSpan={3} className="px-4 py-3 border-r border-slate-300 text-center">Total</td>
                      <td className="px-4 py-3 border-r border-slate-300 text-right">{formatRupiah(totalIuranPeminjam)}</td>
                      <td className="px-4 py-3 border-r border-slate-300 text-right">{formatRupiah(totalPotonganPinjaman)}</td>
                      <td className="px-4 py-3 border-r border-slate-300 text-right text-emerald-700">{formatRupiah(totalSemuaPotongan)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  )}
                  {daftarPeminjam.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Tidak ada peminjam aktif.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: TABUNGAN */}
          {activeTab === "tabungan" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-200 text-center">NO</th>
                    <th className="px-4 py-3 border-r border-slate-200">NAMA</th>
                    <th className="px-4 py-3 border-r border-slate-200">DEPT</th>
                    <th className="px-4 py-3 border-r border-slate-200 text-right">SALDO POKOK</th>
                    <th className="px-4 py-3 border-r border-slate-200 text-right">SALDO WAJIB</th>
                    <th className="px-4 py-3 text-right">TOTAL TABUNGAN</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {members.map((m, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 border-r border-slate-200 text-center font-medium">{i + 1}</td>
                      <td className="px-4 py-3 border-r border-slate-200">{m.nama}</td>
                      <td className="px-4 py-3 border-r border-slate-200">{m.departemen || "-"}</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-right">{formatRupiah(m.saldo_pokok)}</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-right">{formatRupiah(m.saldo_wajib)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatRupiah(m.saldo_pokok + m.saldo_wajib)}</td>
                    </tr>
                  ))}
                  {members.length > 0 && (
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                      <td colSpan={3} className="px-4 py-3 border-r border-slate-300 text-center">Total</td>
                      <td className="px-4 py-3 border-r border-slate-300 text-right">{formatRupiah(totalSaldoPokok)}</td>
                      <td className="px-4 py-3 border-r border-slate-300 text-right">{formatRupiah(totalSaldoWajib)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{formatRupiah(totalSaldoKeseluruhan)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: RUGI LABA */}
          {activeTab === "rugilaba" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 border-r border-slate-200 w-1/2 text-center">Bulan</th>
                    <th className="px-6 py-3 text-center">Pendapatan Bunga Pinjaman</th>
                  </tr>
                </thead>
                <tbody className="bg-white text-center">
                  <tr className="border-b border-slate-100">
                    <td className="px-6 py-3 border-r border-slate-200 font-medium">{currentMonthStr}</td>
                    <td className="px-6 py-3 text-emerald-600 font-semibold">{formatRupiah(totalPendapatanBungaBulanIni)}</td>
                  </tr>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                    <td className="px-6 py-3 border-r border-slate-300">Jumlah</td>
                    <td className="px-6 py-3 text-emerald-700">{formatRupiah(totalPendapatanBungaBulanIni)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: LAPORAN KEUANGAN */}
          {activeTab === "keuangan" && (
            <div className="p-4 md:p-5 bg-slate-50/50 space-y-4 max-w-5xl mx-auto">
              
              {/* PEMASUKAN */}
              <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-50/50 px-5 py-3 border-b border-emerald-100 flex items-center gap-3">
                  <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600 shadow-sm border border-emerald-200/50">
                    <ArrowDownToLine size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-emerald-950 tracking-tight">I. Pemasukan Kas</h3>
                  </div>
                </div>
                
                <div className="p-4 md:px-5 space-y-3 text-sm text-slate-700">
                  
                  {/* Iuran Wajib */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-slate-500 font-bold text-xs shadow-sm border border-slate-200">1</span>
                      <span className="font-semibold text-slate-800">Iuran Wajib Anggota ({currentMonthStr})</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatRupiah(pemasukanIuranWajib)}</span>
                  </div>

                  {/* Iuran Pinjaman */}
                  <div className="pt-1">
                    <div className="flex items-center gap-3 px-3 mb-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs shadow-inner">2</span>
                      <span className="font-semibold text-slate-800">Iuran Pokok Pinjaman</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pl-12 pr-3">
                      {pemasukanPokokPinjaman.map((p, i) => (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 text-slate-600 text-xs">
                          <span className="font-medium">{p.nama} <span className="text-[10px] text-slate-400 font-normal ml-1">({p.dept})</span></span>
                          <span className="font-semibold text-slate-700">{formatRupiah(p.nominal)}</span>
                        </div>
                      ))}
                      {pemasukanPokokPinjaman.length === 0 && (
                        <div className="text-slate-400 italic text-xs py-1">Belum ada iuran pokok pinjaman.</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bunga */}
                  <div className="pt-2">
                    <div className="flex items-center gap-3 px-3 mb-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs shadow-inner border border-amber-200/50">3</span>
                      <span className="font-bold text-amber-700">Pendapatan Bunga <span className="text-[10px] font-normal text-amber-600/70 ml-1">(Laba)</span></span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pl-12 pr-3">
                      {Object.entries(groupedBunga).map(([rate, total], i) => (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 text-slate-600 text-xs">
                          <span className="font-medium">Kelompok Bunga <span className="font-mono text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 ml-1">{formatRupiah(Number(rate))}</span></span>
                          <span className="font-bold text-amber-600">{formatRupiah(total)}</span>
                        </div>
                      ))}
                      {Object.keys(groupedBunga).length === 0 && (
                        <div className="text-slate-400 italic text-xs py-1">Belum ada pendapatan bunga.</div>
                      )}
                    </div>
                  </div>

                  {/* Saldo Bulan Lalu */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-lg mt-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-xs shadow-inner">4</span>
                      <span className="font-semibold text-slate-700">Sisa Saldo Bulan Lalu</span>
                    </div>
                    <span className="font-bold text-slate-700">{formatRupiah(totalSisaSaldoAwal)}</span>
                  </div>

                  {/* TOTAL PEMASUKAN */}
                  <div className="mt-4 pt-3 border-t-2 border-emerald-100 flex justify-between items-center px-3">
                    <span className="font-black text-emerald-950 uppercase tracking-wide">Total Pemasukan</span>
                    <span className="text-lg font-black text-emerald-600 tracking-tight">{formatRupiah(totalPemasukan)}</span>
                  </div>
                  
                </div>
              </div>

              {/* PENGELUARAN */}
              <div className="bg-white rounded-xl shadow-sm border border-rose-100 overflow-hidden">
                <div className="bg-rose-50/50 px-5 py-3 border-b border-rose-100 flex items-center gap-3">
                  <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600 shadow-sm border border-rose-200/50">
                    <ArrowUpFromLine size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-rose-950 tracking-tight">II. Pengeluaran Kas</h3>
                  </div>
                </div>
                
                <div className="p-4 md:px-5 text-sm text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                    {pengeluaranPinjaman.map((p, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold w-4 text-right">{i+1}.</span>
                          <span className="font-medium text-slate-600">Pencairan Dana <span className="font-bold text-slate-800 ml-1">{p.nama}</span></span>
                        </div>
                        <span className="font-bold text-rose-600">{formatRupiah(p.nominal)}</span>
                      </div>
                    ))}
                    {pengeluaranPinjaman.length === 0 && (
                      <div className="col-span-full text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-slate-400 text-xs font-medium italic">Tidak ada pencairan pinjaman bulan ini.</p>
                      </div>
                    )}
                  </div>

                  {/* TOTAL PENGELUARAN */}
                  <div className="mt-4 pt-3 border-t-2 border-rose-100 flex justify-between items-center px-1">
                    <span className="font-black text-rose-950 uppercase tracking-wide">Total Pengeluaran</span>
                    <span className="text-lg font-black text-rose-600 tracking-tight">{formatRupiah(totalPengeluaran)}</span>
                  </div>
                </div>
              </div>

              {/* SALDO AKHIR TICKET */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 shadow-lg border border-slate-700 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                {/* Decorative Elements */}
                <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-10 text-emerald-400 pointer-events-none">
                  <Wallet size={80} strokeWidth={1} />
                </div>
                
                <div className="relative z-10 space-y-0.5 border-l-4 border-emerald-500 pl-3">
                  <p className="text-emerald-400 font-bold uppercase tracking-[0.1em] text-[10px]">Rekapitulasi Final</p>
                  <h2 className="text-white text-lg font-black tracking-tight">Saldo Akhir Kas</h2>
                  <p className="text-slate-400 text-[10px] font-medium">Periode per <span className="text-slate-300">{currentDateStr}</span></p>
                </div>
                
                <div className="relative z-10 text-right bg-black/20 px-4 py-2 rounded-lg border border-white/5 backdrop-blur-sm">
                  <span className="block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500 drop-shadow-sm tracking-tight">
                    {formatRupiah(saldoAkhir)}
                  </span>
                </div>
              </div>

            </div>
          )}

        </CardContent>
      </Card>

      {/* Custom Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400" size={20} />
            <div>
              <p className="font-semibold text-sm">{toastMsg.title}</p>
              <p className="text-xs text-slate-400">{toastMsg.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
