"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Boxes,
  LayoutDashboard,
  ShoppingBag,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import logo from "@/public/imobile.webp"
import { DashboardHeader } from "@/components/custom/dashboard/dashboard-header"
import { FooterProfile } from "@/components/custom/dashboard/footer-profile"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

/* -------------------------------------------------------------------------- */
/* Types & data                                                               */
/* -------------------------------------------------------------------------- */

type DashboardUser = {
  full_name: string
  phone: string
}

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { label: "Products", href: "/products", icon: Boxes },
      { label: "Orders", href: "#orders", icon: ShoppingBag },
      { label: "My Works", href: "#my-works", icon: Wrench },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function isItemActive(pathname: string, href: string) {
  if (href.startsWith("#")) return false // in-page anchors are never "active"
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/* -------------------------------------------------------------------------- */
/* Sidebar pieces                                                             */
/* -------------------------------------------------------------------------- */

const MENU_BUTTON_CLASS = [
  "relative h-10 rounded-none px-3 text-sm font-medium text-[#526274]",
  "transition-colors hover:bg-[#fff1f1] hover:text-[#e7242b]",
  "data-active:bg-[#fff1f1] data-active:font-semibold data-active:text-[#e7242b]",
  // left accent bar for the active item
  "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-transparent",
  "data-active:before:bg-[#e7242b]",
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#e7242b]",
].join(" ")

function SidebarBrand() {
  return (
    <Link
      href="/"
      aria-label="iMobile Supreme home"
      className="flex h-10 items-center group-data-[collapsible=icon]:justify-center"
    >
      {/* Full logo (expanded) */}
      <Image
        src={logo}
        alt="iMobile Supreme"
        width={112}
        height={43}
        className="h-auto w-[112px] object-contain group-data-[collapsible=icon]:hidden"
        priority
      />
      {/* Compact mark (collapsed) */}
      <span
        aria-hidden="true"
        className="hidden size-9 items-center justify-center bg-[#e7242b] text-sm font-bold text-white group-data-[collapsible=icon]:flex"
      >
        iM
      </span>
    </Link>
  )
}

function SidebarNavigation() {
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <SidebarGroup key={group.label} className="p-0 pb-4">
          <SidebarGroupLabel className="mb-1 h-8 rounded-none px-3 text-[11px] font-semibold tracking-wide text-[#8795a3]">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isItemActive(pathname, item.href)}
                      tooltip={item.label}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false)
                      }}
                      className={MENU_BUTTON_CLASS}
                    >
                      <Icon className="size-[18px]" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export function AppSidebar({
  user,
  children,
  footer,
  productName,
}: {
  user: DashboardUser
  children: ReactNode
  footer?: ReactNode
  productName?: string
}) {
  return (
    <SidebarProvider>
      <Sidebar
        collapsible="icon"
        className="border-r border-[#e8edf1] bg-white [&_[data-sidebar=sidebar]]:bg-white [&_[data-sidebar=sidebar]]:text-[#192d4a]"
      >
        <SidebarHeader className="h-16 justify-center border-b border-[#edf0f2] px-4 group-data-[collapsible=icon]:px-2">
          <SidebarBrand />
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-4 group-data-[collapsible=icon]:px-2">
          <SidebarNavigation />
        </SidebarContent>

        <SidebarFooter className="border-t border-[#edf0f2] bg-[#fafbfc] p-3 group-data-[collapsible=icon]:p-2">
          <FooterProfile fullName={user.full_name} phone={user.phone} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="relative min-h-svh bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_34%,#fafbfc_58%,#eef0f2_100%)]">
        <DashboardHeader
          initials={getInitials(user.full_name)}
          productName={productName}
        />
        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:px-8 lg:pt-6 lg:pb-24">
          {children}
        </main>
        {footer}
      </SidebarInset>
    </SidebarProvider>
  )
}