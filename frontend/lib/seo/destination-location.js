function finiteCoordinate(value) {
  if (value === null || value === undefined) return null;

  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") return null;

  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

export function destinationCoordinates(destination) {
  const latitude = finiteCoordinate(destination?.latitude);
  const longitude = finiteCoordinate(destination?.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

export function destinationMapUrl(destination) {
  const coordinates = destinationCoordinates(destination);
  if (!coordinates) return null;

  const query = encodeURIComponent(`${coordinates.latitude},${coordinates.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export { finiteCoordinate };
