"use client";

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon in Next.js/webpack
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

function resolveAssetUrl(asset: unknown): string {
  if (typeof asset === "string") return asset;
  if (asset && typeof asset === "object" && "src" in asset) return (asset as { src: string }).src;
  return "";
}

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: resolveAssetUrl(markerIcon),
  iconRetinaUrl: resolveAssetUrl(markerIcon2x),
  shadowUrl: resolveAssetUrl(markerShadow),
});

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  radius,
  onMapClick,
}: {
  latitude: number;
  longitude: number;
  radius: number;
  onMapClick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      <Marker position={[latitude, longitude]} />
      <Circle
        center={[latitude, longitude]}
        radius={radius}
        pathOptions={{
          color: "#0D7377",
          fillColor: "#0D7377",
          fillOpacity: 0.15,
          weight: 2,
        }}
      />
    </MapContainer>
  );
}
