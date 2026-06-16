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
  originalRole: Role | null
  login: (nik: string, role: Role, nama: string) => void
  logout: () => void
  toggleViewMode: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      originalRole: null,
      login: (nik, role, nama) => set({ 
        user: { id: Date.now().toString(), nik, role, nama }, 
        isAuthenticated: true,
        originalRole: role 
      }),
      logout: () => set({ user: null, isAuthenticated: false, originalRole: null }),
      toggleViewMode: () => set((state) => {
        if (!state.user || state.originalRole !== "admin") return state
        
        return {
          user: {
            ...state.user,
            role: state.user.role === "admin" ? "member" : "admin"
          }
        }
      })
    }),
    {
      name: "auth-storage",
    }
  )
)
