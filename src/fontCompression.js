/**
 * MeshWriter Font Compression/Decompression
 * Base-128 encoding for font data compression (~50% size reduction)
 */

import { isArray } from './utils.js';

const floor = Math.floor;

// Encoding arrays (initialized once at module load)
let b128back;
let b128digits;

/**
 * Initialize encoding arrays for base-128 conversion
 * Called once when module loads
 */
function prepArray() {
    let pntr = -1;
    let n;
    b128back = new Uint8Array(256);
    b128digits = new Array(128);

    while (160 > pntr++) {
        if (pntr < 128) {
            n = fr128to256(pntr);
            b128digits[pntr] = String.fromCharCode(n);
            b128back[n] = pntr;
        } else {
            if (pntr === 128) {
                b128back[32] = pntr;
            } else {
                b128back[pntr + 71] = pntr;
            }
        }
    }

    function fr128to256(n) {
        if (n < 92) {
            return n < 58 ? n < 6 ? n + 33 : n + 34 : n + 35;
        } else {
            return n + 69;
        }
    }
}

// Initialize on module load
prepArray();

/**
 * Convert base-128 encoded string to number
 */
function frB128(s) {
    let result = 0;
    let i = -1;
    const l = s.length - 1;
    while (i++ < l) {
        result = result * 128 + b128back[s.charCodeAt(i)];
    }
    return result;
}

/**
 * Convert number to base-128 encoded string
 */
function toB128(i) {
    let s = b128digits[(i % 128)];
    i = floor(i / 128);
    while (i > 0) {
        s = b128digits[(i % 128)] + s;
        i = floor(i / 128);
    }
    return s;
}

/**
 * Decode a compressed command list string
 * @param {string} str - Compressed string (space-separated encoded commands)
 * @returns {Array} - Array of decoded command arrays
 */
export function decodeList(str) {
    const split = str.split(" ");
    const list = [];

    split.forEach(function(cmds) {
        if (cmds.length === 12) { list.push(decode6(cmds)); }
        if (cmds.length === 8) { list.push(decode4(cmds)); }
        if (cmds.length === 4) { list.push(decode2(cmds)); }
    });

    return list;

    function decode6(s) {
        return [
            decode1(s, 0, 2), decode1(s, 2, 4), decode1(s, 4, 6),
            decode1(s, 6, 8), decode1(s, 8, 10), decode1(s, 10, 12)
        ];
    }
    function decode4(s) {
        return [decode1(s, 0, 2), decode1(s, 2, 4), decode1(s, 4, 6), decode1(s, 6, 8)];
    }
    function decode2(s) {
        return [decode1(s, 0, 2), decode1(s, 2, 4)];
    }
    function decode1(s, start, end) {
        return (frB128(s.substring(start, end)) - 4000) / 2;
    }
}

/**
 * Encode a command list to compressed string
 * @param {Array} list - Array of command arrays
 * @returns {string} - Compressed string
 */
export function codeList(list) {
    let str = "";
    let xtra = "";

    if (isArray(list)) {
        list.forEach(function(cmds) {
            if (cmds.length === 6) { str += xtra + code6(cmds); xtra = " "; }
            if (cmds.length === 4) { str += xtra + code4(cmds); xtra = " "; }
            if (cmds.length === 2) { str += xtra + code2(cmds); xtra = " "; }
        });
    }

    return str;

    function code6(a) {
        return code1(a[0]) + code1(a[1]) + code1(a[2]) + code1(a[3]) + code1(a[4]) + code1(a[5]);
    }
    function code4(a) {
        return code1(a[0]) + code1(a[1]) + code1(a[2]) + code1(a[3]);
    }
    function code2(a) {
        return code1(a[0]) + code1(a[1]);
    }
    function code1(n) {
        return toB128((n + n) + 4000);
    }
}
