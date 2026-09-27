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

/**
 * The pin silhouette: the head and the nib as one path, so a single stroke can
 * run all the way round. The nib springs from the circle's tangent points —
 * (4.01, 19.56) and (19.99, 19.56) for r=11 about (12, 12) with the point at
 * (12, 28) — which is what makes the join smooth rather than a corner.
 */
const PIN_SVG =
  '<svg viewBox="0 0 24 30" aria-hidden="true" focusable="false">' +
  '<path d="M4.01 19.56A11 11 0 1 1 19.99 19.56L12 28Z"/>' +
  "</svg>";

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

      // A numbered pin rather than a bare dot: the number ties the marker to
      // its position in the day, and the colour ties it to the itinerary card.
      const colour = day ? dayColour(day) : "hsl(var(--ink-faint))";
      const position = day
        ? (itinerary?.days.find((d) => d.day === day)?.places.findIndex((q) => q.title === p.title) ?? -1) + 1
        : 0;

      const el = document.createElement("div");
      el.className = "fg-pin";
      el.style.setProperty("--pin", colour);
      el.insertAdjacentHTML("afterbegin", PIN_SVG);
      // Label with the DAY, not the stop index: colour already groups the pins,
      // and a map full of "1"s reads as noise. The stop order is in the popup.
      if (day) {
        const label = document.createElement("span");
        label.textContent = String(day);
        el.appendChild(label);
      }
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", day ? `Day ${day}, stop ${position}: ${p.title}` : p.title);
      el.title = day ? `Day ${day} · stop ${position} — ${p.title}` : p.title;

      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(
          new Popup({ offset: 18, closeButton: false, maxWidth: "240px" }).setHTML(
            `<div class="fg-popup">
               ${p.imageUrl ? `<img src="${p.imageUrl}" alt="" loading="lazy">` : ""}
               <div class="fg-popup-body">
                 <strong>${p.title.replace(/</g, "&lt;")}</strong>
                 ${day ? `<span>Day ${day} · stop ${position}</span>` : ""}
               </div>
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
      el.style.opacity = dimmed ? "0.3" : "1";
      el.classList.toggle("fg-pin-active", hoveredPlace?.title === title);
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
