"use client"

import { ProfilePopover } from "@/components/custom/dashboard/profile-popover"

type FooterProfileProps = {
  fullName: string
  phone: string
  role?: string
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function FooterProfile({
  fullName,
  phone,
  role = "Staff",
}: FooterProfileProps) {
  return (
    <ProfilePopover
      fullName={fullName}
      phone={phone}
      role={role}
      initials={getInitials(fullName)}
    />
  )
}
