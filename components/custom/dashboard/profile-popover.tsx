"use client"

import { useState } from "react"
import { Bell, ChevronUp, CircleUserRound, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

type ProfilePopoverProps = {
  fullName: string
  phone: string
  role: string
  initials: string
}

export function ProfilePopover({
  fullName,
  phone,
  role,
  initials,
}: ProfilePopoverProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    try {
      const response = await fetch("/auth/logout", { method: "POST" })
      if (!response.ok) throw new Error("Unable to log out.")
      router.replace("/login")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition outline-none hover:bg-[#f8fafb] focus-visible:ring-2 focus-visible:ring-[#e7242b]/20"
        aria-label="Open account menu"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffe0e1] text-sm font-bold text-[#e7242b]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[#192d4a]">
              {fullName}
            </p>
            <span className="shrink-0 rounded-full bg-[#e7f8ef] px-2 py-0.5 text-[10px] font-semibold text-[#15945a]">
              {role}
            </span>
          </div>
          <p className="truncate text-xs text-[#7a8490]">{phone}</p>
        </div>
        <ChevronUp className="size-4 shrink-0 text-[#7a8490]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="right"
        sideOffset={10}
        className="w-64 rounded-xl border border-[#e5eaee] bg-white p-1.5 text-[#192d4a] shadow-[0_12px_30px_rgba(29,52,74,0.14)]"
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#ffe0e1] text-xs font-bold text-[#e7242b]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="truncate text-xs text-[#7a8490]">{phone}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-[#edf0f2]" />
        <DropdownMenuItem className="cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm text-[#33465b] focus:bg-[#fff1f1] focus:text-[#e7242b]">
          <CircleUserRound className="size-4" />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm text-[#33465b] focus:bg-[#fff1f1] focus:text-[#e7242b]">
          <Bell className="size-4" />
          Notifications
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#edf0f2]" />
        <DropdownMenuItem
          disabled={loading}
          onClick={() => void signOut()}
          className="cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm text-[#e7242b] focus:bg-[#fff1f1] focus:text-[#c51e27]"
        >
          {loading ? (
            <Spinner className="size-4" />
          ) : (
            <LogOut className="size-4" />
          )}
          {loading ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
