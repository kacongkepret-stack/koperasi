export type Anggota = {
  id: string
  nik: string
  nama: string
  departemen: string
  status: "Aktif" | "Inaktif"
  bergabungSejak: string
  saldoPokok: number
  saldoWajib: number
}

export const dataAnggota: Anggota[] = [
  { id: "1", nik: "EMP-001", nama: "Budi Santoso", departemen: "F&B",  status: "Aktif", bergabungSejak: "2021-03-15", saldoPokok: 500000, saldoWajib: 1200000 },
  { id: "2", nik: "EMP-002", nama: "Siti Aminah", departemen: "Front Office",  status: "Aktif", bergabungSejak: "2022-01-10", saldoPokok: 500000, saldoWajib: 2400000 },
  { id: "3", nik: "EMP-003", nama: "Agus Pratama", departemen: "Housekeeping",  status: "Aktif", bergabungSejak: "2020-11-05", saldoPokok: 500000, saldoWajib: 3600000 },
  { id: "4", nik: "EMP-004", nama: "Dewi Lestari", departemen: "HRD",  status: "Aktif", bergabungSejak: "2019-07-22", saldoPokok: 500000, saldoWajib: 4800000 },
  { id: "5", nik: "EMP-005", nama: "Joko Widodo", departemen: "Engineering",  status: "Inaktif", bergabungSejak: "2021-08-14", saldoPokok: 200000, saldoWajib: 600000 },
  { id: "6", nik: "EMP-006", nama: "Rina Wijaya", departemen: "Finance",  status: "Aktif", bergabungSejak: "2023-02-01", saldoPokok: 400000, saldoWajib: 500000 },
]
