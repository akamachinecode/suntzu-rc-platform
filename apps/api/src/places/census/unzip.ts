import { inflateRawSync } from "node:zlib";

// Reads one file out of a ZIP archive (the Census Bureau ships its Gazetteer files zipped).
// Node has deflate built in, so this is the archive's directory plus one inflate: no package.

const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/** The first entry whose name passes `match`, inflated. */
export function unzipEntry(archive: Uint8Array, match: (name: string) => boolean): ZipEntry {
  const zip = Buffer.from(archive.buffer, archive.byteOffset, archive.byteLength);
  const end = findEndOfDirectory(zip);
  const entries = zip.readUInt16LE(end + 10);
  let offset = zip.readUInt32LE(end + 16);
  if (offset === 0xffffffff) throw new Error("ZIP64 archives aren't supported");

  for (let i = 0; i < entries; i++) {
    if (zip.readUInt32LE(offset) !== DIRECTORY_ENTRY) throw new Error("Damaged ZIP directory");
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;
    if (!match(name)) continue;

    if (zip.readUInt32LE(localOffset) !== LOCAL_HEADER) throw new Error("Damaged ZIP entry");
    const start =
      localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    const raw = zip.subarray(start, start + compressedSize);
    if (method === 0) return { name, data: Buffer.from(raw) };
    if (method === 8) return { name, data: inflateRawSync(raw) };
    throw new Error(`Unsupported ZIP compression method ${method}`);
  }
  throw new Error("No matching file in the ZIP archive");
}

function findEndOfDirectory(zip: Buffer): number {
  // The record is 22 bytes plus a comment of up to 65,535 bytes, at the very end.
  const lowest = Math.max(0, zip.length - 22 - 0xffff);
  for (let i = zip.length - 22; i >= lowest; i--) {
    if (zip.readUInt32LE(i) === END_OF_DIRECTORY) return i;
  }
  throw new Error("Not a ZIP archive");
}
