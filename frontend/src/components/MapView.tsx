import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  LngLatBounds,
} from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CuratedPlace, Itinerary, ResolvedPlace } from "../types";
import { dayColour } from "../dayColour";

/**
 * The itinerary plotted on real ground.
 *
 * MapLibre with OpenStreetMap raster tiles: no key, no bill, no vendor. Markers
 * are coloured by day, which is what makes the geographic clustering legible —
 * you can see at a glance that each day is a tight group rather than a line
 * across the city.
 *
 * Attribution is a licensing requirement for OSM tiles, not decoration.
 */

interface MapViewProps {
  place: ResolvedPlace;
  itinerary: Itinerary | null;
  places: CuratedPlace[];
  hoveredPlace: CuratedPlace | null;
  activeDay: number | null;
}

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Which day a place belongs to, so markers can match the itinerary colours. */
function dayIndexFor(itinerary: Itinerary | null, place: CuratedPlace): number | null {
  if (!itinerary) return null;
  for (const day of itinerary.days) {
    if (day.places.some((p) => p.title === place.title)) return day.day;
  }
  return null;
}

export default function MapView({
  place,
  itinerary,
  places,
  hoveredPlace,
  activeDay,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<InstanceType<typeof MapLibreMap> | null>(null);
  const markers = useRef<globalThis.Map<string, InstanceType<typeof Marker>>>(new globalThis.Map());

  // Create once; never recreate on data change — rebuilding a GL context on
  // every render is both slow and visibly flickers.
  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = new MapLibreMap({
      container: container.current,
      style: OSM_STYLE,
      center: [place.longitude, place.latitude],
      zoom: 11,
      attributionControl: { compact: true },
    });

    instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.current = instance;

    // Capture the ref now: by cleanup time `markers.current` may point elsewhere.
    const activeMarkers = markers.current;
    return () => {
      map.current?.remove();
      map.current = null;
      activeMarkers.clear();
    };
  }, [place.longitude, place.latitude]);

  // Markers follow the data.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    for (const marker of markers.current.values()) marker.remove();
    markers.current.clear();

    if (places.length === 0) return;

    const bounds = new LngLatBounds();

    for (const p of places) {
      const day = dayIndexFor(itinerary, p);

      const el = document.createElement("div");
      el.style.cssText = [
        "width:13px", "height:13px", "border-radius:50%",
        `background:${day ? dayColour(day) : "hsl(var(--ink-faint))"}`,
        "border:2px solid hsl(var(--paper))",
        "box-shadow:0 0 0 1px hsl(var(--ink) / 0.25)",
        "cursor:pointer",
        "transition:transform 140ms ease",
      ].join(";");
      el.setAttribute("aria-label", p.title);
      el.title = day ? `Day ${day} — ${p.title}` : p.title;

      const marker = new Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(
          new Popup({ offset: 14, closeButton: false }).setHTML(
            `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.35;max-width:190px">
               <strong>${p.title.replace(/</g, "&lt;")}</strong>
               ${day ? `<br><span style="opacity:.6">Day ${day}</span>` : ""}
             </div>`
          )
        )
        .addTo(m);

      markers.current.set(p.title, marker);
      bounds.extend([p.longitude, p.latitude]);
    }

    if (!bounds.isEmpty()) {
      m.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 600 });
    }
  }, [places, itinerary]);

  // Emphasis: dim markers outside the focused day, enlarge the hovered one.
  useEffect(() => {
    for (const [title, marker] of markers.current) {
      const el = marker.getElement();
      const day = dayIndexFor(itinerary, places.find((p) => p.title === title)!);
      const dimmed = activeDay !== null && day !== activeDay;
      el.style.opacity = dimmed ? "0.25" : "1";
      el.style.transform = hoveredPlace?.title === title ? "scale(1.6)" : "scale(1)";
      el.style.zIndex = hoveredPlace?.title === title ? "10" : "1";
    }
  }, [hoveredPlace, activeDay, itinerary, places]);

  return (
    <div
      ref={container}
      role="application"
      aria-label={`Map of ${place.name}`}
      className="w-full h-full bg-paper-sunken"
    />
  );
}
