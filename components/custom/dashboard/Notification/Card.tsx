"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Bell, ExternalLink, LoaderCircle } from "lucide-react"

import type { Notification } from "@/lib/api/notification"

function getLinkTarget(link: string | null) {
  if (!link) return null
  const trimmedLink = link.trim()

  if (trimmedLink.startsWith("/") && !trimmedLink.startsWith("//")) {
    return { href: trimmedLink, external: false }
  }

  try {
    const url = new URL(trimmedLink)
    if (url.protocol === "https:" || url.protocol === "http:") {
      return { href: url.toString(), external: true }
    }
  } catch {
    return null
  }

  return null
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"

  const differenceInSeconds = (date.getTime() - Date.now()) / 1000
  const absoluteDifference = Math.abs(differenceInSeconds)
  if (absoluteDifference < 45) return "Just now"

  const relativeTime = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  })
  if (absoluteDifference < 60 * 60) {
    return relativeTime.format(Math.round(differenceInSeconds / 60), "minute")
  }
  if (absoluteDifference < 24 * 60 * 60) {
    return relativeTime.format(Math.round(differenceInSeconds / 3600), "hour")
  }
  if (absoluteDifference < 7 * 24 * 60 * 60) {
    return relativeTime.format(Math.round(differenceInSeconds / 86400), "day")
  }
  if (absoluteDifference < 30 * 24 * 60 * 60) {
    return relativeTime.format(Math.round(differenceInSeconds / 604800), "week")
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date
  )
}

function formatNotificationType(type: string | null) {
  if (!type) return "Notification"

  return type
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function NotificationCard({
  notification,
  onReadChange,
}: {
  notification: Notification
  onReadChange: (id: string, isRead: boolean) => Promise<void>
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUpdatingReadState, setIsUpdatingReadState] = useState(false)
  const [readStateError, setReadStateError] = useState<string | null>(null)
  const linkTarget = getLinkTarget(notification.link)
  const hasExpandableDetails =
    notification.message.length > 160 || Boolean(notification.content_id)

  const handleReadChange = async () => {
    setIsUpdatingReadState(true)
    setReadStateError(null)
    try {
      await onReadChange(notification.id, true)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update notification."
      setReadStateError(message)
    } finally {
      setIsUpdatingReadState(false)
    }
  }

  const handleToggleDetails = () => {
    const shouldExpand = !isExpanded
    setIsExpanded(shouldExpand)

    if (shouldExpand && !notification.is_read && !isUpdatingReadState) {
      void handleReadChange()
    }
  }

  return (
    <article
      className={`rounded-xl border p-4 transition-colors ${
        notification.is_read
          ? "border-slate-200 bg-white"
          : "border-red-100 bg-red-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-red-600 ring-1 ring-red-100">
          <Bell aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
              {notification.title}
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {formatNotificationDate(notification.created_at)}
            {notification.type ? (
              <span className="before:px-1 before:content-['•']">
                {formatNotificationType(notification.type)}
              </span>
            ) : null}
          </p>
          <p
            className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 ${
              isExpanded ? "" : "line-clamp-3"
            }`}
          >
            {notification.message}
          </p>
          {hasExpandableDetails ? (
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={handleToggleDetails}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isExpanded ? "Show less" : "Read more"}
              <ArrowUpRight
                aria-hidden="true"
                className={`size-3 transition-transform ${
                  isExpanded ? "rotate-[-45deg]" : ""
                }`}
              />
            </button>
          ) : null}
          {isExpanded && notification.content_id ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                Related reference
              </p>
              <p className="mt-1 font-mono text-xs break-all text-slate-700">
                {notification.content_id}
              </p>
            </div>
          ) : null}
          {linkTarget ? (
            linkTarget.external ? (
              <a
                href={linkTarget.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800"
              >
                Open related details
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ) : (
              <Link
                href={linkTarget.href}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800"
              >
                Open related details
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            )
          ) : null}
          {isUpdatingReadState ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <LoaderCircle
                aria-hidden="true"
                className="size-3 animate-spin"
              />
              Marking as read...
            </p>
          ) : null}
          {readStateError ? (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {readStateError}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
