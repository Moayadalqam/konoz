"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { LocationWithCount } from "./locations-page";

// Fix default marker icon path for Next.js / webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

interface LocationMapProps {
  locations: LocationWithCount[];
}

export function LocationMap({ locations }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center: Saudi Arabia
    const map = L.map(containerRef.current, {
      center: [24.0, 44.0],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Add markers
    const markers: L.LatLng[] = [];

    for (const loc of locations) {
      if (!loc.latitude || !loc.longitude) continue;

      const latlng = L.latLng(loc.latitude, loc.longitude);
      markers.push(latlng);

      // Marker
      const marker = L.marker(latlng).addTo(map);

      // Popup content
      const statusLabel = loc.is_active
        ? '<span style="color:#059669;font-weight:600;">Active</span>'
        : '<span style="color:#6b7280;font-weight:600;">Inactive</span>';

      marker.bindPopup(
        `<div style="font-family:var(--font-heading),system-ui;min-width:160px;">
          <p style="font-weight:700;font-size:14px;margin:0 0 4px;">${loc.name}</p>
          <p style="color:#6b7280;font-size:12px;margin:0 0 6px;">${loc.city}</p>
          <div style="display:flex;gap:12px;font-size:12px;">
            <span>${loc.employee_count} employee${loc.employee_count !== 1 ? "s" : ""}</span>
            <span>${statusLabel}</span>
          </div>
        </div>`,
        { closeButton: false }
      );

      // Geofence circle
      L.circle(latlng, {
        radius: loc.geofence_radius_meters,
        color: "#0D7377",
        weight: 1.5,
        fillColor: "#0D7377",
        fillOpacity: 0.12,
      }).addTo(map);
    }

    // Fit bounds to markers
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [locations]);

  return <div ref={containerRef} className="h-full w-full" />;
}
