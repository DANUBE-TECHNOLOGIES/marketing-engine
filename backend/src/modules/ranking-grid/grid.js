"use strict";

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function toDegrees(value) {
  return (Number(value) * 180) / Math.PI;
}

function destinationPoint(latitude, longitude, northKm, eastKm) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError("latitude and longitude must be finite numbers");
  }

  const dLat = northKm / EARTH_RADIUS_KM;
  const cosLat = Math.cos(toRadians(lat));
  const safeCos = Math.abs(cosLat) < 1e-9 ? 1e-9 : cosLat;
  const dLng = eastKm / (EARTH_RADIUS_KM * safeCos);

  return {
    latitude: Math.round((lat + toDegrees(dLat)) * 1e7) / 1e7,
    longitude: Math.round((lng + toDegrees(dLng)) * 1e7) / 1e7,
  };
}

function assertOddGridSize(gridSize) {
  const size = Number(gridSize);
  if (!Number.isInteger(size) || size < 3 || size > 11 || size % 2 === 0) {
    throw new RangeError("gridSize must be an odd integer between 3 and 11");
  }
  return size;
}

function generateGrid({ centerLat, centerLng, gridSize = 5, spacingKm = 1 }) {
  const size = assertOddGridSize(gridSize);
  const spacing = Number(spacingKm);
  if (!Number.isFinite(spacing) || spacing <= 0 || spacing > 25) {
    throw new RangeError("spacingKm must be > 0 and <= 25");
  }

  const midpoint = (size - 1) / 2;
  const points = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const northKm = (midpoint - row) * spacing;
      const eastKm = (col - midpoint) * spacing;
      const coordinates = destinationPoint(centerLat, centerLng, northKm, eastKm);
      points.push({
        row,
        col,
        ...coordinates,
        northKm: Math.round(northKm * 1000) / 1000,
        eastKm: Math.round(eastKm * 1000) / 1000,
      });
    }
  }

  return points;
}

module.exports = {
  EARTH_RADIUS_KM,
  destinationPoint,
  generateGrid,
};
