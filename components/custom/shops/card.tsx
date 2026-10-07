"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  ImageOff,
  LoaderCircle,
  Plus,
  Pencil,
  Search,
  Store,
  X,
} from "lucide-react"

import { CreateShopSheet } from "@/components/custom/dashboard/shops/create-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FooterPagination } from "@/components/custom/dashboard/Footer-pagination"
import { createShop, type CreateShopInput } from "@/lib/api/shops"

export type ShopDirectoryItem = {
  id: string
  name: string
  owner: string
  address1: string
  area: string
  phoneNumber: string
  email: string
  image: string | null
  createdByStaffId: string | null
  staffName: string
  canEdit: boolean
}

type ShopField =
  "name" | "owner" | "address1" | "area" | "phoneNumber" | "email"

const FIELD_LABELS: Record<ShopField, string> = {
  name: "shop name",
  owner: "owner name",
  address1: "address",
  area: "area",
  phoneNumber: "phone number",
  email: "email",
}

function getSearchText(shop: ShopDirectoryItem) {
  return [
    shop.name,
    shop.owner,
    shop.address1,
    shop.area,
    shop.phoneNumber,
    shop.email,
    shop.staffName,
  ]
    .join(" ")
    .toLocaleLowerCase()
}

export function filterShopDirectoryItems(
  shops: ShopDirectoryItem[],
  search: string,
  staffFilter: string
) {
  const normalizedSearch = search.trim().toLocaleLowerCase()
  return shops.filter(
    (shop) =>
      (staffFilter === "all" || shop.createdByStaffId === staffFilter) &&
      (!normalizedSearch || getSearchText(shop).includes(normalizedSearch))
  )
}

export function ShopDirectoryFooter({ shops }: { shops: ShopDirectoryItem[] }) {
  const searchParams = useSearchParams()
  const filteredShops = filterShopDirectoryItems(
    shops,
    searchParams.get("search") ?? "",
    searchParams.get("staff") ?? "all"
  )

  if (filteredShops.length === 0) return null

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredShops.length / pageSize))
  const currentPage = Math.min(
    Math.max(Number.parseInt(searchParams.get("page") ?? "1", 10) || 1, 1),
    totalPages
  )

  return (
    <FooterPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={filteredShops.length}
      pageSize={pageSize}
      itemLabel="shops"
      ariaLabel="Shop pages"
    />
  )
}

function InlineShopField({
  shop,
  field,
  value,
  onSave,
}: {
  shop: ShopDirectoryItem
  field: ShopField
  value: string
  onSave: (field: ShopField, value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const nextValue = draft.trim()
    if (!nextValue && field !== "email") {
      setError(`${FIELD_LABELS[field]} cannot be empty.`)
      return
    }
    if (nextValue === value) {
      setEditing(false)
      setError(null)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(field, nextValue)
      setEditing(false)
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : `Unable to update ${FIELD_LABELS[field]}.`
      setError(message)
      console.error(`Unable to update shop ${FIELD_LABELS[field]}:`, saveError)
    } finally {
      setSaving(false)
    }
  }

  const startEditing = () => {
    if (!shop.canEdit) return
    setDraft(value)
    setError(null)
    setEditing(true)
  }

  if (editing && shop.canEdit) {
    return (
      <div className="min-w-0">
        <form
          className="flex min-w-36 items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <Input
            autoFocus
            aria-label={`Edit ${FIELD_LABELS[field]}`}
            aria-invalid={Boolean(error)}
            type={field === "email" ? "email" : "text"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setEditing(false)
                setError(null)
              }
            }}
            disabled={saving}
            className="h-8 min-w-0 rounded-md px-2 text-xs"
          />
          <button
            type="submit"
            aria-label={`Save ${FIELD_LABELS[field]}`}
            disabled={saving}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin"
              />
            ) : (
              <Check aria-hidden="true" className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label={`Cancel editing ${FIELD_LABELS[field]}`}
            disabled={saving}
            onClick={() => {
              setEditing(false)
              setError(null)
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </form>
        {error ? (
          <p role="alert" className="mt-1 text-[10px] text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const displayValue = value || "—"
  if (!shop.canEdit) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              className="inline-flex max-w-full cursor-not-allowed items-center gap-1 truncate text-left text-xs text-slate-500"
            />
          }
        >
          <span className="truncate">{displayValue}</span>
          <Pencil aria-hidden="true" className="size-3 shrink-0 opacity-40" />
        </TooltipTrigger>
        <TooltipContent>
          You don’t have access to edit this shop.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={`Edit ${FIELD_LABELS[field]}: ${displayValue}`}
      className="group inline-flex max-w-full items-center gap-1 truncate text-left text-xs text-slate-700 transition hover:text-red-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
    >
      <span className="truncate">{displayValue}</span>
      <Pencil
        aria-hidden="true"
        className="size-3 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  )
}

function ShopCard({
  shop,
  onSave,
}: {
  shop: ShopDirectoryItem
  onSave: (shopId: string, field: ShopField, value: string) => Promise<void>
}) {
  const saveField = (field: ShopField, value: string) =>
    onSave(shop.id, field, value)

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 p-3">
        <ShopImage shop={shop} className="size-14 rounded-lg" />
        <div className="min-w-0 flex-1">
          <InlineShopField
            shop={shop}
            field="name"
            value={shop.name}
            onSave={saveField}
          />
          <p className="mt-1 truncate text-[11px] text-slate-500">
            Added by {shop.staffName}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-3">
        <ShopCardField
          label="Owner"
          field="owner"
          shop={shop}
          onSave={saveField}
        />
        <ShopCardField
          label="Area"
          field="area"
          shop={shop}
          onSave={saveField}
        />
        <ShopCardField
          label="Address"
          field="address1"
          shop={shop}
          onSave={saveField}
        />
        <ShopCardField
          label="Phone"
          field="phoneNumber"
          shop={shop}
          onSave={saveField}
        />
        <div className="col-span-2">
          <ShopCardField
            label="Email"
            field="email"
            shop={shop}
            onSave={saveField}
          />
        </div>
      </dl>
    </article>
  )
}

function ShopCardField({
  label,
  field,
  shop,
  onSave,
}: {
  label: string
  field: ShopField
  shop: ShopDirectoryItem
  onSave: (field: ShopField, value: string) => Promise<void>
}) {
  const value = shop[field]
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 min-w-0">
        <InlineShopField
          shop={shop}
          field={field}
          value={value}
          onSave={onSave}
        />
      </dd>
    </div>
  )
}

function ShopImage({
  shop,
  className,
}: {
  shop: ShopDirectoryItem
  className: string
}) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-slate-100 ${className}`}
    >
      {shop.image ? (
        <Image
          src={shop.image}
          alt={`${shop.name} shop`}
          fill
          unoptimized
          sizes="56px"
          className="object-cover"
        />
      ) : (
        <ImageOff aria-hidden="true" className="size-5 text-slate-400" />
      )}
    </div>
  )
}

export function ShopDirectory({
  shops: initialShops,
}: {
  shops: ShopDirectoryItem[]
}) {
  const [shopOverrides, setShopOverrides] = useState<
    Record<string, Partial<ShopDirectoryItem>>
  >({})
  const shops = useMemo(
    () =>
      initialShops.map((shop) => ({
        ...shop,
        ...shopOverrides[shop.id],
      })),
    [initialShops, shopOverrides]
  )
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.get("search") ?? ""
  const staffFilter = searchParams.get("staff") ?? "all"

  const staffOptions = useMemo(
    () =>
      [
        ...new Map(
          shops
            .filter((shop) => shop.createdByStaffId)
            .map((shop) => [shop.createdByStaffId as string, shop.staffName])
        ),
      ].map(([id, name]) => ({ id, name })),
    [shops]
  )
  const filteredShops = useMemo(
    () => filterShopDirectoryItems(shops, search, staffFilter),
    [search, shops, staffFilter]
  )
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredShops.length / pageSize))
  const page = Math.max(
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
    1
  )
  const paginatedShops = filteredShops.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  useEffect(() => {
    if (page <= totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(totalPages))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [page, pathname, router, searchParams, totalPages])

  const updateFilters = useCallback(
    (next: { search?: string; staff?: string }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.search !== undefined) {
        if (next.search) params.set("search", next.search)
        else params.delete("search")
      }
      if (next.staff !== undefined) {
        if (next.staff !== "all") params.set("staff", next.staff)
        else params.delete("staff")
      }
      params.set("page", "1")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const saveShopField = async (
    shopId: string,
    field: ShopField,
    value: string
  ) => {
    const response = await fetch(`/api/shops/${shopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    })
    const result = (await response.json()) as {
      error?: string
      field?: ShopField
      value?: string | null
    }

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to update shop.")
    }
    if (result.field !== field || typeof result.value !== "string") {
      throw new Error("Shop update returned an invalid response.")
    }

    setShopOverrides((current) => ({
      ...current,
      [shopId]: { ...current[shopId], [field]: result.value },
    }))
  }

  const handleCreateShop = async (input: CreateShopInput) => {
    await createShop(input)
    router.refresh()
  }

  return (
    <TooltipProvider>
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <header className="space-y-1.5">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-red-600 uppercase">
            Directory
          </p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Shops
          </h1>
          <p className="text-xs text-slate-600">
            Search and review shops. Select an editable value to update your
            shop.
          </p>
        </header>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => {
                updateFilters({ search: event.target.value })
              }}
              placeholder="Search shops, contact details, or staff..."
              aria-label="Search shops"
              className="h-9 rounded-lg pl-9 text-xs"
            />
          </label>
          <Select
            value={staffFilter}
            onValueChange={(value) => {
              updateFilters({ staff: value ?? "all" })
            }}
          >
            <SelectTrigger
              aria-label="Filter by staff"
              className="h-9 w-full rounded-lg text-xs sm:w-52"
            >
              <SelectValue placeholder="All staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {staffOptions.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CreateShopSheet
            onCreate={handleCreateShop}
            trigger={(openSheet) => (
              <>
                <Button
                  type="button"
                  onClick={openSheet}
                  className="hidden h-9 shrink-0 gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-red-700 md:inline-flex"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add shop
                </Button>
                <Button
                  type="button"
                  onClick={openSheet}
                  aria-label="Add shop"
                  title="Add shop"
                  className="fixed right-5 bottom-24 z-40 size-14 rounded-full bg-red-600 p-0 text-white shadow-lg shadow-red-900/20 hover:bg-red-700 md:hidden"
                >
                  <Plus aria-hidden="true" className="size-6" />
                </Button>
              </>
            )}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>
            Showing {filteredShops.length} of {shops.length}{" "}
            {shops.length === 1 ? "shop" : "shops"}
          </p>
          {search || staffFilter !== "all" ? (
            <button
              type="button"
              onClick={() => {
                updateFilters({ search: "", staff: "all" })
              }}
              className="font-medium text-red-700 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {filteredShops.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {paginatedShops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} onSave={saveShopField} />
              ))}
            </div>
            <div
              role="region"
              aria-label="Shop directory table"
              tabIndex={0}
              className="hidden max-h-[calc(100dvh-20rem)] max-w-full min-w-0 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9] overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 md:block [&_[data-slot=table-container]]:overflow-visible [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-corner]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100"
            >
              <div className="min-w-[900px]">
                <Table className="w-full text-xs [&_td]:px-3 [&_td]:py-2.5 [&_th]:h-9 [&_th]:px-3">
                  <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow className="hover:bg-slate-50">
                      <TableHead>Shop</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Added by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedShops.map((shop) => (
                      <TableRow key={shop.id}>
                        <TableCell className="max-w-44">
                          <div className="flex min-w-0 items-center gap-2">
                            <ShopImage
                              shop={shop}
                              className="size-9 rounded-md"
                            />
                            <InlineShopField
                              shop={shop}
                              field="name"
                              value={shop.name}
                              onSave={(field, value) =>
                                saveShopField(shop.id, field, value)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-32">
                          <InlineShopField
                            shop={shop}
                            field="owner"
                            value={shop.owner}
                            onSave={(field, value) =>
                              saveShopField(shop.id, field, value)
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-28">
                          <InlineShopField
                            shop={shop}
                            field="area"
                            value={shop.area}
                            onSave={(field, value) =>
                              saveShopField(shop.id, field, value)
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-40">
                          <InlineShopField
                            shop={shop}
                            field="address1"
                            value={shop.address1}
                            onSave={(field, value) =>
                              saveShopField(shop.id, field, value)
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-32">
                          <InlineShopField
                            shop={shop}
                            field="phoneNumber"
                            value={shop.phoneNumber}
                            onSave={(field, value) =>
                              saveShopField(shop.id, field, value)
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-40">
                          <InlineShopField
                            shop={shop}
                            field="email"
                            value={shop.email}
                            onSave={(field, value) =>
                              saveShopField(shop.id, field, value)
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-28 truncate text-slate-500">
                          {shop.staffName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Store aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {shops.length
                ? "No shops match these filters"
                : "No active shops"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {shops.length
                ? "Try another search term or staff filter."
                : "Active shops will appear here when they are available."}
            </p>
          </div>
        )}
      </section>
    </TooltipProvider>
  )
}
