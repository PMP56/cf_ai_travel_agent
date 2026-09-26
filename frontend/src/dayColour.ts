/**
 * Day marker colours, shared by the itinerary list and the map so a day reads
 * as the same colour in both. Lives outside the component files because
 * exporting a non-component alongside components breaks React Fast Refresh.
 */
export function dayColour(day: number): string {
  return `var(--color-day-${((day - 1) % 6) + 1})`;
}
