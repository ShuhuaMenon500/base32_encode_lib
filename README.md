# base32_encode_lib

Encodes and decodes byte buffers to Crockford Base32 strings for checksum-safe, human-readable identifiers.

```js
import { encode, decode } from './src/index.js';

const id = encode(new Uint8Array([0x66, 0x6f, 0x6f, 0x62, 0x61]));
// → "CPNMUOJ1"

const bytes = decode('CPNMUOJ1');
// → Uint8Array(5) [ 102, 111, 111, 98, 97 ]
```

## Why

Identifier serialisation for URLs, logs, and configuration files benefits from an alphabet that excludes visually ambiguous characters (no `0` vs `O`, no `1` vs `I`). Crockford Base32 defines exactly such an alphabet and is widely recognised. This library implements the encoding and decoding with no external dependencies, which matters in constrained or audited environments where pulling in a general-purpose base32 library is undesirable.

The trade-off: we implement only the core encode/decode, not Crockford's optional check-symbol extension. Adding check symbols would force every caller to agree on whether the check byte is present, and most identifier pipelines already apply their own checksum layer. Keeping the surface narrow avoids that ambiguity.

## Edge you will hit

Encoding zero-pads the bit stream to the next 5-bit boundary, so the decoded byte length can be smaller than the full bit length implied by the string. Strings produced by `encode` always round-trip losslessly, but a hand-written string with trailing bits set to non-zero will decode without error — those trailing bits are silently discarded. This matches Crockford's own description of padding bits as non-data, but it means `decode` does not validate them.

`decode` accepts mixed case and trims surrounding whitespace. It rejects any character outside `0-9A-V` (case-insensitive) with a `RangeError`.
