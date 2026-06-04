"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login")
      } else if (isAuthenticated && pathname === "/login") {
        router.push("/")
      }
    }
  }, [isAuthenticated, pathname, router, mounted])

  // Prevent hydration mismatch or flashing before auth check is done
  if (!mounted) return null
  
  if (!isAuthenticated && pathname !== "/login") return null

  return <>{children}</>
}
