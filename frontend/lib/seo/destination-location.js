export function destinationCoordinates(destination) {
  const latitude = Number(destination?.latitude);
  const longitude = Number(destination?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
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
