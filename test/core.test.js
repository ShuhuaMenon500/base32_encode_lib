import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode } from '../src/core.js';

const enc = (arr) => encode(new Uint8Array(arr));

// --- Basic vectors ----------------------------------------------------------

// "f" -> 0b00110 -> 'CO'  (zero-padded to 10 bits)
test('single byte 0x66 encodes to CO', () => {
  assert.equal(enc([0x66]), 'CO');
});

// "fo" -> 0b00110|01101|1110 -> 'CPNG'
test('two bytes 0x66 0x6f encodes to CPNG', () => {
  assert.equal(enc([0x66, 0x6f]), 'CPNG');
});

// "foo" -> 0b00110|01101|11101|1110 -> 'CPNMU'
test('three bytes 0x66 0x6f 0x6f encodes to CPNMU', () => {
  assert.equal(enc([0x66, 0x6f, 0x6f]), 'CPNMU');
});

// "foob" -> 0b00110|01101|11101|11101|10010|00 -> 'CPNMUOG'
test('four bytes 0x66 0x6f 0x6f 0x62 encodes to CPNMUOG', () => {
  assert.equal(enc([0x66, 0x6f, 0x6f, 0x62]), 'CPNMUOG');
});

// "fooba" -> 0b00110|01101|01101|11101|01101|11101|10001|00110 -> 'CPNMUOJ1'
// Five bytes is an exact boundary (40 bits = 8 quintuples), so no zero-padding here.
test('five bytes 0x66 0x6f 0x6f 0x62 0x61 encodes to CPNMUOJ1', () => {
  assert.equal(enc([0x66, 0x6f, 0x6f, 0x62, 0x61]), 'CPNMUOJ1');
});

// Five bytes is an exact boundary (40 bits), so no zero-padding here.
test('five-byte boundary round-trips exactly', () => {
  const bytes = [0x66, 0x6f, 0x6f, 0x62, 0x61];
  assert.deepEqual(decode(enc(bytes)), new Uint8Array(bytes));
});

// --- Edge cases -------------------------------------------------------------

test('empty input encodes to empty string', () => {
  assert.equal(enc([]), '');
});

test('empty string decodes to empty Uint8Array', () => {
  assert.deepEqual(decode(''), new Uint8Array(0));
});

test('decode is case-insensitive', () => {
  const bytes = [0x66, 0x6f, 0x6f];
  assert.deepEqual(decode('cpnmu'), new Uint8Array(bytes));
});

test('decode trims surrounding whitespace', () => {
  const bytes = [0x66, 0x6f, 0x6f];
  assert.deepEqual(decode('  CPNMU\n'), new Uint8Array(bytes));
});

test('all 256 byte values round-trip', () => {
  const bytes = Array.from({ length: 256 }, (_, i) => i);
  const encoded = enc(bytes);
  assert.deepEqual(decode(encoded), new Uint8Array(bytes));
});

test('decode rejects invalid character', () => {
  assert.throws(() => decode('CPNM!U'), RangeError);
});

test('decode rejects lowercase alphabet beyond A-V', () => {
  // 'W' is not in the Crockford alphabet
  assert.throws(() => decode('CPNMW'), RangeError);
});

test('encode accepts ArrayBuffer', () => {
  const buf = new ArrayBuffer(3);
  const view = new Uint8Array(buf);
  view[0] = 0x66; view[1] = 0x6f; view[2] = 0x6f;
  assert.equal(encode(buf), 'CPNMU');
});

test('encode rejects non-byte array elements', () => {
  assert.throws(() => encode([0x66, 'x', 0x6f]), TypeError);
  assert.throws(() => encode([0x66, -1, 0x6f]), TypeError);
  assert.throws(() => encode([0x66, 256, 0x6f]), TypeError);
});

test('decode rejects non-string input', () => {
  assert.throws(() => decode(123), TypeError);
  assert.throws(() => decode(null), TypeError);
});

test('encode rejects non byte-source input', () => {
  assert.throws(() => encode('hello'), TypeError);
  assert.throws(() => encode(42), TypeError);
});

test('byte length 1 to 10 round-trip', () => {
  for (let len = 1; len <= 10; len++) {
    const bytes = Array.from({ length: len }, (_, i) => (i * 37 + 11) & 0xff);
    const encoded = enc(bytes);
    assert.deepEqual(decode(encoded), new Uint8Array(bytes));
  }
});

test('output is uppercase', () => {
  const result = enc([0x66, 0x6f, 0x6f, 0x62, 0x61]);
  assert.equal(result, result.toUpperCase());
});
