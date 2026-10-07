"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { Bell, LoaderCircle, RefreshCw } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  fetchNotifications,
  getNotificationUserId,
  updateNotificationRead,
  type Notification,
} from "@/lib/api/notification"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

import { NotificationCard } from "./Card"

type NotificationCenterValue = {
  open: boolean
  setOpen: (open: boolean) => void
  unreadCount: number
}

const NotificationCenterContext =
  createContext<NotificationCenterValue | null>(null)

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext)
  if (!context) {
    throw new Error(
      "useNotificationCenter must be used within NotificationProvider."
    )
  }
  return context
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setIsLoading(true)
      setError(null)
    }
    setOpen(nextOpen)
  }

  const loadNotifications = useCallback(
    async (recipientId: string) => {
      try {
        const result = await fetchNotifications(supabase, recipientId)
        setNotifications(result)
        setError(null)
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load notifications."
        setError(message)
        console.error("Unable to load notifications:", loadError)
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )
  const handleReadChange = useCallback(
    async (notificationId: string, isRead: boolean) => {
      await updateNotificationRead(notificationId, isRead)
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: isRead }
            : notification
        )
      )
    },
    []
  )

  useEffect(() => {
    let isActive = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const subscribeToNotifications = async () => {
      try {
        const recipientId = await getNotificationUserId(supabase)
        if (!isActive) return
        setUserId(recipientId)
        void loadNotifications(recipientId)

        channel = supabase
          .channel(`notifications:${recipientId}`, {
            config: { private: true },
          })
          .on("broadcast", { event: "notification_created" }, () => {
            void loadNotifications(recipientId)
          })
          .subscribe((status, subscriptionError) => {
            if (!isActive) return

            if (status === "SUBSCRIBED") {
              void loadNotifications(recipientId)
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              const message = subscriptionError
                ? subscriptionError.message
                : `Notification Realtime subscription ${status
                    .toLowerCase()
                    .replace("_", " ")}.`
              setError(message)
              setIsLoading(false)
              console.error(
                "Unable to subscribe to notification updates:",
                subscriptionError ?? message
              )
            }
          })
      } catch (loadError) {
        if (!isActive) return
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to initialize notifications."
        setError(message)
        setIsLoading(false)
        console.error("Unable to initialize notifications:", loadError)
      }
    }

    void subscribeToNotifications()

    return () => {
      isActive = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [loadNotifications, supabase])

  return (
    <NotificationCenterContext.Provider
      value={{ open, setOpen: handleOpenChange, unreadCount }}
    >
      {children}
      <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-xl flex-col gap-0 overflow-hidden border-l border-red-100 p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 border-b border-red-100 bg-red-50/60 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <Bell aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold text-slate-900">
                  Notifications
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs text-slate-600">
                  Updates sent to your account
                  {userId ? ` · ${notifications.length} total` : ""}
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              aria-label="Refresh notifications"
              disabled={!userId || isLoading}
              onClick={() => {
                if (userId) {
                  setIsLoading(true)
                  void loadNotifications(userId)
                }
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          {isLoading && notifications.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onReadChange={handleReadChange}
              />
            ))
          ) : !isLoading && !error ? (
            <div className="py-12 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Bell aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                You’re all caught up
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Notifications sent to your account will appear here.
              </p>
            </div>
          ) : null}
        </div>
      </SheetContent>
      </Sheet>
    </NotificationCenterContext.Provider>
  )
}

export function NotificationBellButton() {
  const { open, setOpen, unreadCount } = useNotificationCenter()

  return (
    <button
      type="button"
      aria-label={
        unreadCount > 0
          ? `View notifications, ${unreadCount} unread`
          : "View notifications"
      }
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
      className="relative flex size-9 items-center justify-center rounded-lg text-[#526274] transition hover:bg-[#fff1f1] hover:text-[#e7242b] focus-visible:ring-2 focus-visible:ring-[#e7242b]/40 focus-visible:outline-none"
    >
      <Bell aria-hidden="true" className="size-[18px]" />
      {unreadCount > 0 ? (
        <span className="absolute top-0.5 right-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-[#e7242b] px-1 text-[8px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  )
}
