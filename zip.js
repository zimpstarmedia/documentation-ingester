// Minimal ZIP writer (STORE method, no compression). Dependency-free.
// Produces a valid .zip Blob from a list of { name, text } entries.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// DOS date/time. Pass a Date; defaults are fine for archive metadata.
function dosDateTime(date) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (Math.floor(date.getSeconds() / 2));
  const day =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, day };
}

function writeU16(arr, offset, val) {
  arr[offset] = val & 0xff;
  arr[offset + 1] = (val >>> 8) & 0xff;
}

function writeU32(arr, offset, val) {
  arr[offset] = val & 0xff;
  arr[offset + 1] = (val >>> 8) & 0xff;
  arr[offset + 2] = (val >>> 16) & 0xff;
  arr[offset + 3] = (val >>> 24) & 0xff;
}

/**
 * @param {{name: string, text: string}[]} entries
 * @param {Date} now timestamp for all entries (passed in; popup supplies it)
 * @returns {Blob}
 */
export function createZip(entries, now) {
  const encoder = new TextEncoder();
  const { time, day } = dosDateTime(now || new Date(0));

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.text);
    const crc = crc32(dataBytes);

    // Local file header (30 bytes + name).
    const local = new Uint8Array(30 + nameBytes.length);
    writeU32(local, 0, 0x04034b50);
    writeU16(local, 4, 20);          // version needed
    writeU16(local, 6, 0x0800);      // flags: UTF-8 filename
    writeU16(local, 8, 0);           // method: store
    writeU16(local, 10, time);
    writeU16(local, 12, day);
    writeU32(local, 14, crc);
    writeU32(local, 18, dataBytes.length); // compressed size
    writeU32(local, 22, dataBytes.length); // uncompressed size
    writeU16(local, 26, nameBytes.length);
    writeU16(local, 28, 0);          // extra length
    local.set(nameBytes, 30);

    localParts.push(local, dataBytes);

    // Central directory header (46 bytes + name).
    const central = new Uint8Array(46 + nameBytes.length);
    writeU32(central, 0, 0x02014b50);
    writeU16(central, 4, 20);         // version made by
    writeU16(central, 6, 20);         // version needed
    writeU16(central, 8, 0x0800);     // flags: UTF-8
    writeU16(central, 10, 0);         // method
    writeU16(central, 12, time);
    writeU16(central, 14, day);
    writeU32(central, 16, crc);
    writeU32(central, 20, dataBytes.length);
    writeU32(central, 24, dataBytes.length);
    writeU16(central, 28, nameBytes.length);
    writeU16(central, 30, 0);         // extra length
    writeU16(central, 32, 0);         // comment length
    writeU16(central, 34, 0);         // disk number
    writeU16(central, 36, 0);         // internal attrs
    writeU32(central, 38, 0);         // external attrs
    writeU32(central, 42, offset);    // local header offset
    central.set(nameBytes, 46);

    centralParts.push(central);

    offset += local.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const centralOffset = offset;

  // End of central directory record (22 bytes).
  const eocd = new Uint8Array(22);
  writeU32(eocd, 0, 0x06054b50);
  writeU16(eocd, 4, 0);
  writeU16(eocd, 6, 0);
  writeU16(eocd, 8, entries.length);
  writeU16(eocd, 10, entries.length);
  writeU32(eocd, 12, centralSize);
  writeU32(eocd, 16, centralOffset);
  writeU16(eocd, 20, 0);

  return new Blob([...localParts, ...centralParts, eocd], {
    type: "application/zip",
  });
}
