"use client"

import Image from "next/image"
import { Bell, Menu, ShoppingCart } from "lucide-react"

import logo from "@/public/imobile.webp"
import { SearchBar } from "@/components/custom/SearchBar"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function DashboardHeader({ initials }: { initials: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-[#edf0f2] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <SidebarTrigger className="size-9 rounded-lg text-[#192d4a] hover:bg-[#fff1f1] md:hidden">
        <Menu className="size-5" />
      </SidebarTrigger>
      <div className="flex min-w-0 flex-1 items-center justify-center md:hidden">
        <Image
          src={logo}
          alt="iMobile Supreme"
          width={112}
          height={43}
          className="h-auto w-[112px] object-contain"
        />
      </div>
      <SearchBar />
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label="View cart"
          className="relative flex size-9 items-center justify-center rounded-lg text-[#526274] transition hover:bg-[#fff1f1] hover:text-[#e7242b]"
        >
          <ShoppingCart className="size-[18px]" />
          <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#e7242b] text-[8px] font-bold text-white">
            0
          </span>
        </button>
        <button
          type="button"
          aria-label="View notifications"
          className="flex size-9 items-center justify-center rounded-lg text-[#526274] transition hover:bg-[#fff1f1] hover:text-[#e7242b]"
        >
          <Bell className="size-[18px]" />
        </button>
        <div className="hidden size-8 items-center justify-center rounded-full bg-[#ffe0e1] text-[11px] font-bold text-[#e7242b] md:flex">
          {initials}
        </div>
      </div>
    </header>
  )
}
