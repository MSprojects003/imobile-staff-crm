"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Bell, Menu, ShoppingCart } from "lucide-react"

import logo from "@/public/imobile.webp"
import { SearchBar } from "@/components/custom/SearchBar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useCart } from "@/components/providers/cart-provider"
import { getCategory } from "@/components/custom/products/product-data"

function getPageName(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).at(-1)

  if (!segment) {
    return "Dashboard"
  }

  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function DashboardHeader({
  initials,
  productName,
}: {
  initials: string
  productName?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { itemCount } = useCart()
  const pageName = getPageName(pathname)
  const isDashboard = pathname === "/"
  const isProducts = pathname === "/products"
  const isProductDetails = pathname.startsWith("/products/")
  const selectedCategory = getCategory(searchParams.get("category") ?? undefined)

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-[#edf0f2] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <SidebarTrigger className="size-9 shrink-0 rounded-lg text-[#192d4a] hover:bg-[#fff1f1]">
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
      <Breadcrumb className="hidden min-w-0 flex-1 md:block">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {isProductDetails ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/products">Products</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">
                  {productName ?? "Product"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : !isProducts ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              {!isDashboard ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="truncate">
                      {isProductDetails ? productName ?? "Product" : pageName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/products">Products</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbLink href="/products">Categories</BreadcrumbLink>
              </BreadcrumbItem>
              {selectedCategory ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="truncate">
                      {selectedCategory.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="hidden w-full max-w-sm shrink md:block">
        <SearchBar />
      </div>
      <div className="ml-4 flex shrink-0 items-center justify-end gap-1">
        <div className="md:hidden">
          <SearchBar />
        </div>
        <div className="relative">
          <Link
            href="/cart"
            aria-label="View cart"
            className="relative flex size-9 items-center justify-center rounded-lg text-[#526274] transition hover:bg-[#fff1f1] hover:text-[#e7242b]"
          >
            <ShoppingCart className="size-[18px]" />
            {itemCount > 0 ? (
              <span className="absolute top-0.5 right-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-[#e7242b] px-1 text-[8px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>
        </div>
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
