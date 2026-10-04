"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Boxes, ClipboardList, LayoutDashboard } from "lucide-react"
import logo from "@/public/imobile.webp"
import { DashboardHeader } from "@/components/custom/dashboard/dashboard-header"
import { FooterProfile } from "@/components/custom/dashboard/footer-profile"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"

type DashboardUser = {
  full_name: string
  phone: string
}

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Products", href: "#products", icon: Boxes },
  { label: "Orders", href: "#orders", icon: ClipboardList },
  { label: "My Works", href: "#my-works", icon: ClipboardList },
]

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function SidebarNavigation() {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenu className="gap-1.5">
      {navigation.map((item, index) => {
        const Icon = item.icon
        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              render={<Link href={item.href} />}
              isActive={index === 0}
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false)
                }
              }}
              className="h-11 rounded-lg px-3 text-sm font-medium text-[#526274] hover:bg-[#fff1f1] hover:text-[#e7242b] data-active:bg-[#ffe8e9] data-active:text-[#e7242b]"
            >
              <Icon className="size-[18px]" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function AppSidebar({
  user,
  children,
}: {
  user: DashboardUser
  children: ReactNode
}) {
  return (
    <SidebarProvider>
      <Sidebar
        collapsible="offcanvas"
        className="border-[#e8edf1] bg-white [&_[data-sidebar=sidebar]]:bg-white [&_[data-sidebar=sidebar]]:text-[#192d4a]"
      >
        <SidebarHeader className="border-b border-[#edf0f2] px-5 py-2.5">
          <Link href="/" className="flex items-center">
            <Image
              src={logo}
              alt="iMobile Supreme"
              width={112}
              height={43}
              className="h-auto w-[112px] object-contain"
              priority
            />
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-3 py-5">
          <SidebarNavigation />
        </SidebarContent>
        <SidebarFooter className="border-t border-[#edf0f2] p-3">
          <FooterProfile fullName={user.full_name} phone={user.phone} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f8fafb]">
        <DashboardHeader initials={getInitials(user.full_name)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
