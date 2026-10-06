import convert from "color-convert"
import colorName from "color-name"

type Rgb = [number, number, number]

function parseColor(value: string): Rgb | null {
  const input = value.trim().toLowerCase()
  const keyword = colorName[input as keyof typeof colorName]

  if (keyword) {
    return keyword
  }

  const hex = input.replace("#", "")
  if (/^[\da-f]{3,8}$/i.test(hex)) {
    const normalized =
      hex.length <= 4
        ? hex
            .slice(0, 3)
            .split("")
            .map((part) => part + part)
            .join("")
        : hex.slice(0, 6)

    if (normalized.length === 6) {
      return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16),
      ]
    }
  }

  const rgb = input.match(
    /^rgba?\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/,
  )
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  }

  const hsl = input.match(
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/,
  )
  if (hsl) {
    return convert.hsl.rgb([
      Number(hsl[1]),
      Number(hsl[2]),
      Number(hsl[3]),
    ]) as Rgb
  }

  return null
}

function formatColorName(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function getColorName(value: string) {
  const rgb = parseColor(value)
  if (!rgb) {
    return formatColorName(value)
  }

  const nearestName = convert.rgb.keyword(rgb)
  return formatColorName(nearestName)
}
