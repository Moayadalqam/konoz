const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Haversine distance in meters between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/**
 * Check if coordinates are within a location's geofence radius.
 */
export function isWithinGeofence(
  workerLat: number,
  workerLng: number,
  locationLat: number,
  locationLng: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(workerLat, workerLng, locationLat, locationLng);
  return distance <= radiusMeters;
}

/**
 * Validate GPS reading for spoofing indicators.
 * Returns warnings — records are still saved but flagged.
 */
export function validateGpsReading(
  lat: number,
  lng: number,
  accuracy: number | null
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Null island — coordinates at exactly (0,0)
  if (lat === 0 && lng === 0) {
    warnings.push("Coordinates at null island (0,0) — likely invalid");
  }

  // Accuracy exactly 0 — spoofed GPS often reports 0 accuracy
  if (accuracy === 0) {
    warnings.push("GPS accuracy is exactly 0 — possible spoofing");
  }

  // Very low accuracy (> 500m) — unreliable reading
  if (accuracy !== null && accuracy > 500) {
    warnings.push(`GPS accuracy is ${Math.round(accuracy)}m — very unreliable`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
