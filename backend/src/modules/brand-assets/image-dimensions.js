"use strict";

function pngDimensions(
  buffer
) {
  if (
    buffer.length < 24
  ) {
    return null;
  }

  return {
    width:
      buffer.readUInt32BE(16),

    height:
      buffer.readUInt32BE(20),
  };
}

function jpegDimensions(
  buffer
) {
  let offset = 2;

  while (
    offset + 9 <
    buffer.length
  ) {
    if (
      buffer[offset] !==
      0xff
    ) {
      offset += 1;
      continue;
    }

    const marker =
      buffer[
        offset + 1
      ];

    const standalone =
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (
        marker >= 0xd0 &&
        marker <= 0xd7
      );

    if (standalone) {
      offset += 2;
      continue;
    }

    if (
      offset + 4 >
      buffer.length
    ) {
      break;
    }

    const length =
      buffer.readUInt16BE(
        offset + 2
      );

    const sof =
      (
        marker >= 0xc0 &&
        marker <= 0xc3
      ) ||
      (
        marker >= 0xc5 &&
        marker <= 0xc7
      ) ||
      (
        marker >= 0xc9 &&
        marker <= 0xcb
      ) ||
      (
        marker >= 0xcd &&
        marker <= 0xcf
      );

    if (
      sof &&
      offset + 8 <
      buffer.length
    ) {
      return {
        height:
          buffer.readUInt16BE(
            offset + 5
          ),

        width:
          buffer.readUInt16BE(
            offset + 7
          ),
      };
    }

    if (length < 2) {
      break;
    }

    offset +=
      2 + length;
  }

  return null;
}

function webpDimensions(
  buffer
) {
  if (
    buffer.length < 30
  ) {
    return null;
  }

  const chunkType =
    buffer
      .subarray(
        12,
        16
      )
      .toString("ascii");

  if (
    chunkType ===
    "VP8X"
  ) {
    return {
      width:
        1 +
        buffer.readUIntLE(
          24,
          3
        ),

      height:
        1 +
        buffer.readUIntLE(
          27,
          3
        ),
    };
  }

  return null;
}

function extractImageDimensions(
  buffer,
  mimeType
) {
  if (
    mimeType ===
    "image/png"
  ) {
    return pngDimensions(
      buffer
    );
  }

  if (
    mimeType ===
    "image/jpeg"
  ) {
    return jpegDimensions(
      buffer
    );
  }

  if (
    mimeType ===
    "image/webp"
  ) {
    return webpDimensions(
      buffer
    );
  }

  return null;
}

module.exports = {
  extractImageDimensions,
  pngDimensions,
  jpegDimensions,
  webpDimensions,
};
