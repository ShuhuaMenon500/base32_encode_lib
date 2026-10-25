/**
 * Crockford Base32 core encode/decode operating on Uint8Array and string.
 *
 * Encoding alphabet (subset of Crockford's): 0-9 and A-V (case-normalised to upper
 * on output, case-insensitive on input). We deliberately do NOT implement the
 * optional check-symbol extension because it would require the caller to know
 * which symbol set is in use; keeping the surface to raw encode/decode avoids
 * that ambiguity.
 *
 * Padding: encoding zero-pads the bit stream to the next 40-bit (8-quintuple)
 * boundary and omits trailing '=' characters. This round-trips losslessly for
 * arbitrary byte lengths, which is the property identifier serialisation needs.
 *
 * Decoding rejects characters outside the alphabet with RangeError rather than
 * silently dropping them — a checksum-safe identifier that silently accepted
 * bad input would defeat the purpose.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
const DECODE_MAP = new Map();
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE_MAP.set(ALPHABET[i], i);
  DECODE_MAP.set(ALPHABET[i].toLowerCase(), i);
}

/**
 * Encode a byte buffer into a Crockford Base32 string (no '=' padding).
 *
 * @param {Uint8Array|ArrayBuffer|Array<number>|number[]} bytes
 * @returns {string}
 * @throws {TypeError} if input is not a recognised byte source.
 */
export function encode(bytes) {
  const view = toUint8Array(bytes);
  if (view.length === 0) return '';

  let out = '';
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < view.length; i++) {
    buffer = (buffer << 8) | view[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    // Flush the remaining bits, zero-padded to a full quintuple.
    out += ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }
  return out;
}

/**
 * Decode a Crockford Base32 string into a new Uint8Array.
 *
 * @param {string} str
 * @returns {Uint8Array}
 * @throws {RangeError} if the string contains a character outside 0-9A-V (case-insensitive).
 */
export function decode(str) {
  if (typeof str !== 'string') {
    throw new TypeError('decode expects a string');
  }
  const trimmed = str.trim();
  if (trimmed.length === 0) return new Uint8Array(0);

  const result = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const value = DECODE_MAP.get(ch);
    if (value === undefined) {
      throw new RangeError(`Invalid Crockford Base32 character: ${JSON.stringify(ch)}`);
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      result.push((buffer >>> bits) & 0xff);
    }
  }
  // Trailing bits (< 8) are the zero-padding introduced by encode() and are
  // discarded. We do not verify they are zero because Crockford's spec permits
  // them to carry non-data bits in other contexts; here we only guarantee that
  // strings produced by encode() round-trip.
  return new Uint8Array(result);
}

/**
 * Coerce common byte-source types into a Uint8Array view without copying when
 * the source is already a Uint8Array sharing the same buffer.
 */
function toUint8Array(bytes) {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }
  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }
  if (Array.isArray(bytes)) {
    // Validate early so a non-numeric element fails here, not silently producing NaN.
    for (let i = 0; i < bytes.length; i++) {
      if (typeof bytes[i] !== 'number' || !Number.isInteger(bytes[i]) || bytes[i] < 0 || bytes[i] > 255) {
        throw new TypeError(`Array element at index ${i} is not a byte (0-255 integer)`);
      }
    }
    return new Uint8Array(bytes);
  }
  if (ArrayBuffer.isView(bytes) && bytes.byteLength !== undefined) {
    // Typed arrays other than Uint8Array — view over the same backing buffer.
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  throw new TypeError('encode expects Uint8Array, ArrayBuffer, or an array of byte integers');
}
