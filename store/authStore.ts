import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Role = "admin" | "member"

export interface User {
  id: string
  nik: string
  nama: string
  role: Role
  departemen?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (nik: string, role: Role, nama: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (nik, role, nama) => set({ user: { id: Date.now().toString(), nik, role, nama }, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
    }
  )
)
