import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

function resolveAssetUrl(asset: unknown): string {
  if (typeof asset === "string") return asset;
  if (asset && typeof asset === "object" && "src" in asset)
    return (asset as { src: string }).src;
  return "";
}

// Fix default marker icon path for Next.js / webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: resolveAssetUrl(markerIcon),
  iconRetinaUrl: resolveAssetUrl(markerIcon2x),
  shadowUrl: resolveAssetUrl(markerShadow),
});

export { L };
