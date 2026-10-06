"use client"

import * as React from "react"

import {
  addCartItem,
  fetchCartItems,
  repriceCartItems,
  removeCartItem,
  updateCartItemQuantity,
  type CartItem,
} from "@/lib/api/cart"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

type AddCartItemInput = {
  productId: string
  models: string[]
  colors: string[]
  quantity: number
  subtotal: number
}

type CartContextValue = {
  items: CartItem[]
  itemCount: number
  isLoading: boolean
  error: string | null
  addItem: (item: AddCartItemInput) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  removeItem: (id: string) => Promise<void>
  clearCart: () => void
}

type CartBroadcastRow = {
  id?: unknown
  quantity?: unknown
  subtotal?: unknown
  isCleared?: unknown
}

const CartContext = React.createContext<CartContextValue | null>(null)

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isNormalSocketClose(error: unknown) {
  if (!(error instanceof Error)) return false
  if (error.message === "socket closed: 1000") return true

  const cause = error.cause
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === 1000
  )
}

function logCartError(context: string, error: unknown) {
  console.error(`${context} ${getErrorMessage(error)}`)
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), [])

  const loadCart = React.useCallback(
    async (publicUserId?: string) => {
      const result = await fetchCartItems(supabase, publicUserId)
      setItems(result.items)
      setError(null)
      return result.publicUserId
    },
    [supabase]
  )

  const applyCartBroadcast = React.useCallback(
    (payload: unknown) => {
      if (typeof payload !== "object" || payload === null) return false
      const broadcast = payload as {
        eventType?: unknown
        new?: CartBroadcastRow
        old?: CartBroadcastRow
      }
      const eventType = broadcast.eventType
      if (eventType === "INSERT") return true
      const row = eventType === "DELETE" ? broadcast.old : broadcast.new
      if (
        typeof row?.id !== "string" ||
        (eventType !== "DELETE" &&
          row.isCleared !== true &&
          (typeof row.quantity !== "number" ||
            typeof row.subtotal !== "number"))
      ) {
        return false
      }

      setItems((current) => {
        const updatedItems =
          eventType === "DELETE" ||
          (eventType !== "DELETE" && row.isCleared === true)
            ? current.filter((item) => item.id !== row.id)
            : current.map((item) =>
                item.id === row.id
                  ? {
                      ...item,
                      quantity: row.quantity as number,
                      subtotal: row.subtotal as number,
                    }
                  : item
              )

        return repriceCartItems(updatedItems)
      })
      return false
    },
    [setItems]
  )

  React.useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined
    let cancelled = false

    const initialize = async () => {
      const publicUserId = await loadCart()
      if (cancelled) return
      if (!publicUserId) {
        setError("No active public user profile is linked to the signed-in account.")
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      channel = supabase
        .channel(`cart:${publicUserId}`, { config: { private: true } })
        .on(
          "broadcast",
          { event: "cart_changed" },
          ({ payload }) => {
            if (!applyCartBroadcast(payload)) return
            void loadCart(publicUserId).catch((loadError: unknown) => {
              setError(getErrorMessage(loadError))
              logCartError("Unable to refresh cart:", loadError)
            })
          }
        )
        .subscribe((status, subscriptionError) => {
          if (cancelled) return

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (isNormalSocketClose(subscriptionError)) return

            const message = subscriptionError
              ? getErrorMessage(subscriptionError)
              : `Cart Realtime subscription ${status.toLowerCase().replace("_", " ")}.`
            setError(message)
            if (subscriptionError) {
              logCartError("Unable to subscribe to cart updates:", subscriptionError)
            }
          }
        })
    }

    void initialize().catch((loadError: unknown) => {
      setError(getErrorMessage(loadError))
      setIsLoading(false)
      logCartError("Unable to initialize cart:", loadError)
    })

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [applyCartBroadcast, loadCart, supabase])

  const addItem = React.useCallback(
    async (item: AddCartItemInput) => {
      await addCartItem(supabase, item)
      await loadCart()
    },
    [loadCart, supabase]
  )

  const updateQuantity = React.useCallback(
    async (id: string, quantity: number) => {
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Cart quantity must be a positive whole number.")
      }

      const previousItems = items
      const updatedItems = repriceCartItems(
        items.map((item) => (item.id === id ? { ...item, quantity } : item))
      )
      setItems(updatedItems)
      try {
        await updateCartItemQuantity(supabase, id, quantity)
      } catch (error) {
        setItems(previousItems)
        throw error
      }
    },
    [items, supabase]
  )

  const removeItem = React.useCallback(
    async (id: string) => {
      const previousItems = items
      setItems(repriceCartItems(items.filter((item) => item.id !== id)))
      try {
        await removeCartItem(supabase, id)
      } catch (error) {
        setItems(previousItems)
        throw error
      }
    },
    [items, supabase]
  )

  const clearCart = React.useCallback(() => {
    setItems([])
    setError(null)
  }, [])

  const value = React.useMemo(
    () => ({
      items,
      itemCount: items.length,
      isLoading,
      error,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, isLoading, error, addItem, updateQuantity, removeItem, clearCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = React.useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider.")
  }

  return context
}
