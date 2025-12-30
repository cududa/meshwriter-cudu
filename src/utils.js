/**
 * MeshWriter Utility Functions
 * Pure helper functions with no external dependencies
 */

const floor = Math.floor;

// Type checking functions
export function isPositiveNumber(mn) {
    return typeof mn === "number" && !isNaN(mn) ? 0 < mn : false;
}

export function isNumber(mn) {
    return typeof mn === "number";
}

export function isBoolean(mn) {
    return typeof mn === "boolean";
}

export function isAmplitude(ma) {
    return typeof ma === "number" && !isNaN(ma) ? 0 <= ma && ma <= 1 : false;
}

export function isObject(mo) {
    return mo != null && typeof mo === "object" || typeof mo === "function";
}

export function isPromiseLike(mo) {
    return isObject(mo) && typeof mo.then === "function";
}

export function isArray(ma) {
    return ma != null && typeof ma === "object" && ma.constructor === Array;
}

export function isString(ms) {
    return typeof ms === "string" ? ms.length > 0 : false;
}

export function isRelativeLength(l) {
    return l === 3 || l === 5 || l === 7;
}

// Math utilities
export function round(n) {
    return floor(0.3 + n * 1000000) / 1000000;
}

export function weeid() {
    return Math.floor(Math.random() * 1000000);
}

// Option handling
export function setOption(opts, field, tst, defalt) {
    return tst(opts[field]) ? opts[field] : defalt;
}
