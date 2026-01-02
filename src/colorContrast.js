/**
 * Color Contrast Utilities for WCAG Compliance
 * Provides color manipulation for dyslexia accessibility
 */

// ============================================
// Color Conversion Utilities
// ============================================

/**
 * Convert hex color string to RGB object (0-1 range)
 * @param {string} hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
    hex = hex.replace("#", "");
    return {
        r: parseInt(hex.substring(0, 2), 16) / 255,
        g: parseInt(hex.substring(2, 4), 16) / 255,
        b: parseInt(hex.substring(4, 6), 16) / 255
    };
}

/**
 * Convert RGB object (0-1 range) to hex color string
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {string}
 */
export function rgbToHex(rgb) {
    var r = Math.round(Math.max(0, Math.min(1, rgb.r)) * 255);
    var g = Math.round(Math.max(0, Math.min(1, rgb.g)) * 255);
    var b = Math.round(Math.max(0, Math.min(1, rgb.b)) * 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-1)
 * @param {number} g - Green (0-1)
 * @param {number} b - Blue (0-1)
 * @returns {{h: number, s: number, l: number}} - h in degrees (0-360), s and l in 0-1
 */
export function rgbToHsl(r, g, b) {
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h, s;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
        h *= 360;
    }

    return { h: h, s: s, l: l };
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue in degrees (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {{r: number, g: number, b: number}}
 */
export function hslToRgb(h, s, l) {
    var r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        var hNorm = h / 360;

        r = hue2rgb(p, q, hNorm + 1 / 3);
        g = hue2rgb(p, q, hNorm);
        b = hue2rgb(p, q, hNorm - 1 / 3);
    }

    return { r: r, g: g, b: b };
}

// ============================================
// WCAG Luminance Calculations
// ============================================

/**
 * Linearize an sRGB channel value
 * @param {number} c - Channel value (0-1)
 * @returns {number} - Linearized value
 */
function linearize(c) {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance per WCAG 2.1
 * @param {number} r - Red (0-1)
 * @param {number} g - Green (0-1)
 * @param {number} b - Blue (0-1)
 * @returns {number} - Relative luminance (0-1)
 */
export function relativeLuminance(r, g, b) {
    var rLin = linearize(r);
    var gLin = linearize(g);
    var bLin = linearize(b);
    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculate WCAG contrast ratio between two luminance values
 * @param {number} L1 - Luminance of first color (0-1)
 * @param {number} L2 - Luminance of second color (0-1)
 * @returns {number} - Contrast ratio (1-21)
 */
export function contrastRatio(L1, L2) {
    var lighter = Math.max(L1, L2);
    var darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color is essentially gray (no saturation)
 * @param {{r: number, g: number, b: number}} rgb
 * @param {number} [tolerance=0.02]
 * @returns {boolean}
 */
function isGray(rgb, tolerance) {
    tolerance = tolerance || 0.02;
    var max = Math.max(rgb.r, rgb.g, rgb.b);
    var min = Math.min(rgb.r, rgb.g, rgb.b);
    return (max - min) < tolerance;
}

// ============================================
// Luminance Adjustment
// ============================================

/**
 * Adjust color to target luminance while preserving hue
 * Uses binary search in HSL space
 * Desaturates significantly at low lightness for better visual contrast
 * @param {{r: number, g: number, b: number}} rgb
 * @param {number} targetLum - Target relative luminance (0-1)
 * @returns {{r: number, g: number, b: number}}
 */
function adjustToLuminance(rgb, targetLum) {
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Binary search to find lightness that achieves target luminance
    var minL = 0;
    var maxL = 1;
    var iterations = 20;
    var finalL;

    for (var i = 0; i < iterations; i++) {
        var midL = (minL + maxL) / 2;
        var testRgb = hslToRgb(hsl.h, hsl.s, midL);
        var testLum = relativeLuminance(testRgb.r, testRgb.g, testRgb.b);

        if (testLum < targetLum) {
            minL = midL;
        } else {
            maxL = midL;
        }
    }

    finalL = (minL + maxL) / 2;

    // Desaturate significantly at low lightness for better visual contrast
    // Dark saturated colors (e.g., dark yellow) don't look distinct enough
    // Scale saturation based on lightness: below 0.3 lightness, reduce saturation
    var finalS = hsl.s;
    if (finalL < 0.3) {
        // Linear ramp: at L=0.3, keep 100% saturation; at L=0, keep 20% saturation
        var saturationScale = 0.2 + (finalL / 0.3) * 0.8;
        finalS = hsl.s * saturationScale;
    }

    return hslToRgb(hsl.h, finalS, finalL);
}

// ============================================
// Auto-Derive Edge Colors
// ============================================

/**
 * Auto-derive edge colors (diffuse/ambient) from emissive color
 * Creates high-contrast edges for text legibility
 *
 * INVERTED APPROACH: Since emissive adds to all surfaces equally,
 * we flip the strategy - put bright color in diffuse (shows on lit surfaces)
 * and dark color in emissive (base for unlit surfaces).
 * Returns modified emissive along with diffuse/ambient.
 *
 * @param {string} emissiveHex - Hex color string for desired face color
 * @param {number} [targetContrast=4.5] - Target WCAG contrast ratio
 * @returns {{diffuse: string, ambient: string, emissive: string}}
 */
export function deriveEdgeColors(emissiveHex, targetContrast) {
    targetContrast = targetContrast || 4.5;

    var rgb = hexToRgb(emissiveHex);
    var faceLum = relativeLuminance(rgb.r, rgb.g, rgb.b);

    // Calculate target luminance for dark areas to achieve contrast
    var darkLum;
    if (faceLum > 0.5) {
        // Bright face needs dark edges
        darkLum = (faceLum + 0.05) / targetContrast - 0.05;
        darkLum = Math.max(darkLum, 0.0);
    } else {
        // Dark face needs light edges (invert the logic)
        darkLum = targetContrast * (faceLum + 0.05) - 0.05;
        darkLum = Math.min(darkLum, 1.0);
    }

    // Handle edge cases
    if (faceLum > 0.95) {
        darkLum = Math.min(0.1, darkLum);
    } else if (faceLum < 0.05) {
        darkLum = Math.max(0.5, darkLum);
    }

    // Generate dark color (desaturated at low lightness)
    var darkRgb = adjustToLuminance(rgb, darkLum);

    // INVERTED APPROACH:
    // - diffuse = bright (the user's desired face color) - shows on lit surfaces
    // - emissive = dark - base color for all surfaces (unlit areas show this)
    // - ambient = very dark - shadowed areas
    var ambientLum = darkLum * 0.5;
    var ambientRgb = adjustToLuminance(rgb, Math.max(0, ambientLum));

    return {
        diffuse: emissiveHex,           // Bright color for lit surfaces
        ambient: rgbToHex(ambientRgb),  // Very dark for shadows
        emissive: rgbToHex(darkRgb)     // Dark base for unlit areas
    };
}

// ============================================
// High-Contrast Adjustment Algorithm
// ============================================

/**
 * Adjust color by a factor (lightness change with optional hue shift)
 * @param {{r: number, g: number, b: number}} rgb
 * @param {number} factor - Adjustment factor (-1 to 1, negative = darken)
 * @param {boolean} allowHueShift
 * @returns {{r: number, g: number, b: number}}
 */
function adjustColorByFactor(rgb, factor, allowHueShift) {
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Adjust lightness
    var newL = hsl.l + factor;
    newL = Math.max(0, Math.min(1, newL));

    // Optionally shift hue for extreme adjustments
    var newH = hsl.h;
    if (allowHueShift && Math.abs(factor) > 0.2) {
        // Slight hue shift toward yellow (high luminance) or blue (low luminance)
        var hueTarget = factor > 0 ? 60 : 240;
        newH = hsl.h + (hueTarget - hsl.h) * Math.abs(factor) * 0.1;
        newH = ((newH % 360) + 360) % 360;
    }

    // Reduce saturation at extreme lightness for natural look
    var newS = hsl.s;
    if (newL > 0.9 || newL < 0.1) {
        newS *= 0.5;
    }

    return hslToRgb(newH, newS, newL);
}

/**
 * Oscillate edge colors to find best contrast
 * @param {{r: number, g: number, b: number}} emissive
 * @param {{r: number, g: number, b: number}} diffuse
 * @param {{r: number, g: number, b: number}} ambient
 * @param {object} options
 * @returns {{diffuse: object, ambient: object, achieved: number}}
 */
function oscillateEdges(emissive, diffuse, ambient, options) {
    var emissiveLum = relativeLuminance(emissive.r, emissive.g, emissive.b);
    var diffuseLum = relativeLuminance(diffuse.r, diffuse.g, diffuse.b);
    var currentContrast = contrastRatio(emissiveLum, diffuseLum);

    var bestResult = { diffuse: diffuse, ambient: ambient, achieved: currentContrast };

    // Determine direction: edges should go opposite to emissive luminance
    var direction = emissiveLum > 0.5 ? -1 : 1;

    var steps = 10;
    for (var i = 1; i <= steps; i++) {
        var factor = (i / steps) * options.range;

        // Primary direction
        var testDiffuse = adjustColorByFactor(diffuse, direction * factor, options.allowHueShift);
        var testAmbient = adjustColorByFactor(ambient, direction * factor * 0.8, options.allowHueShift);

        var testLum = relativeLuminance(testDiffuse.r, testDiffuse.g, testDiffuse.b);
        var contrast = contrastRatio(emissiveLum, testLum);

        if (contrast > bestResult.achieved) {
            bestResult = { diffuse: testDiffuse, ambient: testAmbient, achieved: contrast };
        }

        if (contrast >= options.targetContrast) break;

        // Try opposite direction for edge cases
        testDiffuse = adjustColorByFactor(diffuse, -direction * factor, options.allowHueShift);
        testAmbient = adjustColorByFactor(ambient, -direction * factor * 0.8, options.allowHueShift);

        testLum = relativeLuminance(testDiffuse.r, testDiffuse.g, testDiffuse.b);
        contrast = contrastRatio(emissiveLum, testLum);

        if (contrast > bestResult.achieved) {
            bestResult = { diffuse: testDiffuse, ambient: testAmbient, achieved: contrast };
        }
    }

    return bestResult;
}

/**
 * Oscillate face color to find better contrast
 * @param {{r: number, g: number, b: number}} emissive
 * @param {{r: number, g: number, b: number}} diffuse
 * @param {object} options
 * @returns {{emissive: object, achieved: number}}
 */
function oscillateFace(emissive, diffuse, options) {
    var diffuseLum = relativeLuminance(diffuse.r, diffuse.g, diffuse.b);
    var emissiveLum = relativeLuminance(emissive.r, emissive.g, emissive.b);
    var currentContrast = contrastRatio(emissiveLum, diffuseLum);

    var bestResult = { emissive: emissive, achieved: currentContrast };

    // Face should move opposite to edges
    var direction = diffuseLum > 0.5 ? -1 : 1;

    var steps = 10;
    for (var i = 1; i <= steps; i++) {
        var factor = (i / steps) * options.range;

        var testEmissive = adjustColorByFactor(emissive, direction * factor, options.allowHueShift);
        var testLum = relativeLuminance(testEmissive.r, testEmissive.g, testEmissive.b);
        var contrast = contrastRatio(testLum, diffuseLum);

        if (contrast > bestResult.achieved) {
            bestResult = { emissive: testEmissive, achieved: contrast };
        }

        if (contrast >= options.targetContrast) break;
    }

    return bestResult;
}

/**
 * Adjust colors to achieve WCAG contrast while preserving user intent
 * Priority: prefer edge modifications over face modifications
 *
 * @param {object} colors - User-provided colors
 * @param {string} colors.emissive - Face color (hex)
 * @param {string} colors.diffuse - Edge lit color (hex)
 * @param {string} [colors.ambient] - Edge shadow color (hex)
 * @param {object} [options]
 * @param {number} [options.targetContrast=4.5] - Target contrast ratio
 * @param {number} [options.edgeRange=0.4] - Max edge modification (0-1)
 * @param {number} [options.faceRange=0.1] - Max face modification (0-1)
 * @param {boolean} [options.allowHueShift=true] - Allow hue modifications
 * @returns {{emissive: string, diffuse: string, ambient: string, achieved: number}}
 */
export function adjustForContrast(colors, options) {
    options = options || {};
    var targetContrast = options.targetContrast || 4.5;
    var edgeRange = options.edgeRange || 0.4;
    var faceRange = options.faceRange || 0.1;
    var allowHueShift = options.allowHueShift !== false;

    var emissive = hexToRgb(colors.emissive);
    var diffuse = hexToRgb(colors.diffuse);
    var ambient = colors.ambient ? hexToRgb(colors.ambient) : { r: diffuse.r * 0.5, g: diffuse.g * 0.5, b: diffuse.b * 0.5 };

    var emissiveLum = relativeLuminance(emissive.r, emissive.g, emissive.b);
    var diffuseLum = relativeLuminance(diffuse.r, diffuse.g, diffuse.b);
    var currentContrast = contrastRatio(emissiveLum, diffuseLum);

    // Already meets target?
    if (currentContrast >= targetContrast) {
        return {
            emissive: colors.emissive,
            diffuse: colors.diffuse,
            ambient: colors.ambient || rgbToHex(ambient),
            achieved: currentContrast
        };
    }

    // Phase 1: Try edge modification only
    var edgeResult = oscillateEdges(emissive, diffuse, ambient, {
        targetContrast: targetContrast,
        range: edgeRange,
        allowHueShift: allowHueShift
    });

    if (edgeResult.achieved >= targetContrast) {
        return {
            emissive: colors.emissive,
            diffuse: rgbToHex(edgeResult.diffuse),
            ambient: rgbToHex(edgeResult.ambient),
            achieved: edgeResult.achieved
        };
    }

    // Phase 2: Try face modification
    var faceResult = oscillateFace(emissive, edgeResult.diffuse, {
        targetContrast: targetContrast,
        range: faceRange,
        allowHueShift: allowHueShift
    });

    if (faceResult.achieved >= targetContrast) {
        return {
            emissive: rgbToHex(faceResult.emissive),
            diffuse: rgbToHex(edgeResult.diffuse),
            ambient: rgbToHex(edgeResult.ambient),
            achieved: faceResult.achieved
        };
    }

    // Phase 3: Oscillate both until convergence
    var maxIterations = 5;
    var currentEmissive = faceResult.emissive;
    var currentDiffuse = edgeResult.diffuse;
    var currentAmbient = edgeResult.ambient;
    var bestAchieved = faceResult.achieved;

    for (var iter = 0; iter < maxIterations; iter++) {
        // Try more edge adjustment
        var newEdgeResult = oscillateEdges(currentEmissive, currentDiffuse, currentAmbient, {
            targetContrast: targetContrast,
            range: edgeRange * 0.5,
            allowHueShift: allowHueShift
        });

        if (newEdgeResult.achieved >= targetContrast) {
            return {
                emissive: rgbToHex(currentEmissive),
                diffuse: rgbToHex(newEdgeResult.diffuse),
                ambient: rgbToHex(newEdgeResult.ambient),
                achieved: newEdgeResult.achieved
            };
        }

        // Try more face adjustment
        var newFaceResult = oscillateFace(currentEmissive, newEdgeResult.diffuse, {
            targetContrast: targetContrast,
            range: faceRange * 0.5,
            allowHueShift: allowHueShift
        });

        if (newFaceResult.achieved >= targetContrast) {
            return {
                emissive: rgbToHex(newFaceResult.emissive),
                diffuse: rgbToHex(newEdgeResult.diffuse),
                ambient: rgbToHex(newEdgeResult.ambient),
                achieved: newFaceResult.achieved
            };
        }

        // Update for next iteration
        if (newFaceResult.achieved > bestAchieved) {
            bestAchieved = newFaceResult.achieved;
            currentEmissive = newFaceResult.emissive;
            currentDiffuse = newEdgeResult.diffuse;
            currentAmbient = newEdgeResult.ambient;
        } else {
            // No improvement, stop
            break;
        }
    }

    // Return best result even if target not achieved
    return {
        emissive: rgbToHex(currentEmissive),
        diffuse: rgbToHex(currentDiffuse),
        ambient: rgbToHex(currentAmbient),
        achieved: bestAchieved
    };
}

// ============================================
// Constants
// ============================================

export var CONTRAST_LEVELS = {
    AA_NORMAL: 4.5,
    AA_LARGE: 3.0,
    AAA_NORMAL: 7.0,
    AAA_LARGE: 4.5
};
