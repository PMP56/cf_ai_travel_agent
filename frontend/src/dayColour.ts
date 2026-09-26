/**
 * Day marker colours, shared by the itinerary cards and the map pins so a day
 * reads as the same colour in both.
 *
 * References the raw `--day-N` custom properties on :root, NOT the `--color-day-N`
 * names from Tailwind's `@theme inline` block. `inline` means Tailwind
 * substitutes those values into utility classes at build time and never emits
 * them as runtime custom properties — so `var(--color-day-1)` resolves to
 * nothing in an inline style and silently falls back to the inherited colour.
 * That is what turned every day badge into a blank circle and every map pin
 * into a grey blob.
 *
 * Lives outside the component files because exporting a non-component beside
 * components breaks React Fast Refresh.
 */
export function dayColour(day: number): string {
  return `hsl(var(--day-${((day - 1) % 6) + 1}))`;
}
