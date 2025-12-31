/**
 * MeshWriter Font Converter
 * Converts TTF/OTF fonts to MeshWriter format using opentype.js
 */

import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'fs';

// Default character set - basic Latin + common symbols
export const DEFAULT_CHARSET =
    ' !"#$%&\'()*+,-./0123456789:;<=>?@' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
    'abcdefghijklmnopqrstuvwxyz{|}~' +
    '\u00A0\u00A1\u00A2\u00A3\u00A4\u00A5\u00A6\u00A7\u00A8\u00A9\u00AA\u00AB\u00AC\u00AD\u00AE\u00AF' +
    '\u00B0\u00B1\u00B2\u00B3\u00B4\u00B5\u00B6\u00B7\u00B8\u00B9\u00BA\u00BB\u00BC\u00BD\u00BE\u00BF' +
    '\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF' +
    '\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D7\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF' +
    '\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF' +
    '\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F7\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u00FF';

// ============ Base-128 Encoding ============

const floor = Math.floor;
let b128digits;

function initEncoding() {
    if (b128digits) return;

    b128digits = new Array(128);
    for (let pntr = 0; pntr < 128; pntr++) {
        const n = fr128to256(pntr);
        b128digits[pntr] = String.fromCharCode(n);
    }

    function fr128to256(n) {
        if (n < 92) {
            return n < 58 ? n < 6 ? n + 33 : n + 34 : n + 35;
        } else {
            return n + 69;
        }
    }
}

function toB128(i) {
    initEncoding();
    let s = b128digits[(i % 128)];
    i = floor(i / 128);
    while (i > 0) {
        s = b128digits[(i % 128)] + s;
        i = floor(i / 128);
    }
    return s;
}

function encodeCoord(n) {
    // Convert coordinate to base-128 encoded 2-character string
    // Formula: (n * 2) + 4000, then base-128 encode
    return toB128((n + n) + 4000);
}

function encodeCommand(coords) {
    return coords.map(c => encodeCoord(Math.round(c))).join('');
}

function encodeCommandList(list) {
    return list.map(cmd => encodeCommand(cmd)).join(' ');
}

// ============ Path Conversion ============

/**
 * Convert opentype.js glyph path to MeshWriter command arrays
 * @param {object} glyph - opentype.js glyph object
 * @param {number} scale - Scale factor (typically 1)
 * @returns {{ shapes: number[][][], holes: number[][][] }}
 */
function convertGlyphPath(glyph, scale = 1) {
    const path = glyph.path;
    if (!path || !path.commands || path.commands.length === 0) {
        return { shapes: [], holes: [] };
    }

    const contours = [];
    let currentContour = [];
    let startX = 0, startY = 0;

    for (const cmd of path.commands) {
        switch (cmd.type) {
            case 'M': // moveTo
                if (currentContour.length > 0) {
                    contours.push(currentContour);
                }
                currentContour = [];
                startX = cmd.x * scale;
                startY = cmd.y * scale;
                currentContour.push([startX, startY]);
                break;

            case 'L': // lineTo
                currentContour.push([cmd.x * scale, cmd.y * scale]);
                break;

            case 'Q': // quadraticCurveTo
                currentContour.push([
                    cmd.x1 * scale, cmd.y1 * scale,
                    cmd.x * scale, cmd.y * scale
                ]);
                break;

            case 'C': // bezierCurveTo (cubic)
                currentContour.push([
                    cmd.x1 * scale, cmd.y1 * scale,
                    cmd.x2 * scale, cmd.y2 * scale,
                    cmd.x * scale, cmd.y * scale
                ]);
                break;

            case 'Z': // closePath
                // Close back to start if not already there
                if (currentContour.length > 0) {
                    const last = currentContour[currentContour.length - 1];
                    const lastX = last.length === 2 ? last[0] : last[last.length - 2];
                    const lastY = last.length === 2 ? last[1] : last[last.length - 1];

                    if (Math.abs(lastX - startX) > 0.01 || Math.abs(lastY - startY) > 0.01) {
                        currentContour.push([startX, startY]);
                    }
                }
                if (currentContour.length > 0) {
                    contours.push(currentContour);
                }
                currentContour = [];
                break;
        }
    }

    // Handle any remaining open contour
    if (currentContour.length > 0) {
        contours.push(currentContour);
    }

    // Determine which contours are shapes vs holes based on winding
    // For TrueType: clockwise = shape, counter-clockwise = hole
    // For CFF: counter-clockwise = shape, clockwise = hole
    const shapes = [];
    const holes = [];

    for (const contour of contours) {
        if (contour.length < 2) continue;

        const winding = calculateWinding(contour);

        // TrueType convention: clockwise (negative area) = outer shape
        // We'll let the reverseShapes/reverseHoles flags handle the actual winding
        if (winding < 0) {
            shapes.push(contour);
        } else {
            holes.push(contour);
        }
    }

    return { shapes, holes };
}

/**
 * Calculate signed area / winding of a contour
 * Negative = clockwise (TrueType outer), Positive = counter-clockwise (TrueType hole)
 */
function calculateWinding(contour) {
    let area = 0;
    let prevX = 0, prevY = 0;

    for (let i = 0; i < contour.length; i++) {
        const cmd = contour[i];
        let x, y;

        if (cmd.length === 2) {
            [x, y] = cmd;
        } else if (cmd.length === 4) {
            // Quadratic - use endpoint
            x = cmd[2];
            y = cmd[3];
        } else if (cmd.length === 6) {
            // Cubic - use endpoint
            x = cmd[4];
            y = cmd[5];
        } else {
            continue;
        }

        if (i > 0) {
            area += (x - prevX) * (y + prevY);
        }

        prevX = x;
        prevY = y;
    }

    // Close the polygon
    const first = contour[0];
    if (first && first.length >= 2) {
        area += (first[0] - prevX) * (first[1] + prevY);
    }

    return area;
}

// ============ Font Conversion ============

/**
 * Convert a font file to MeshWriter format
 * @param {string} fontPath - Path to TTF/OTF file
 * @param {object} options - Conversion options
 * @returns {object} - MeshWriter font object
 */
export async function convertFont(fontPath, options = {}) {
    const {
        charset = DEFAULT_CHARSET,
        scale = 1,
        name = 'font'
    } = options;

    // Load font
    const fontBuffer = readFileSync(fontPath);
    const font = opentype.parse(fontBuffer.buffer);

    if (!font) {
        throw new Error(`Failed to parse font: ${fontPath}`);
    }

    console.log(`Converting font: ${font.names.fullName?.en || name}`);
    console.log(`  Units per EM: ${font.unitsPerEm}`);
    console.log(`  Glyphs: ${font.glyphs.length}`);

    // Determine winding direction based on font format
    // TrueType (.ttf) uses clockwise winding for outer contours
    // CFF/OpenType (.otf with CFF) uses counter-clockwise
    const isCFF = font.outlinesFormat === 'cff';
    const reverseShapes = !isCFF; // TrueType needs reverseShapes
    const reverseHoles = isCFF;   // CFF needs reverseHoles

    console.log(`  Format: ${font.outlinesFormat} (reverseShapes: ${reverseShapes}, reverseHoles: ${reverseHoles})`);

    // Build font specification
    const fontSpec = {
        reverseHoles,
        reverseShapes
    };

    let convertedCount = 0;
    let skippedCount = 0;

    for (const char of charset) {
        const glyph = font.charToGlyph(char);

        if (!glyph || glyph.index === 0) {
            // Glyph not found (index 0 is .notdef)
            skippedCount++;
            continue;
        }

        const { shapes, holes } = convertGlyphPath(glyph, scale);

        if (shapes.length === 0 && holes.length === 0) {
            // Empty glyph (space, etc.) - still include for width
            if (glyph.advanceWidth > 0) {
                fontSpec[char] = {
                    sC: [],
                    xMin: 0,
                    xMax: 0,
                    yMin: 0,
                    yMax: 0,
                    wdth: Math.round(glyph.advanceWidth * scale)
                };
                convertedCount++;
            } else {
                skippedCount++;
            }
            continue;
        }

        // Encode shapes
        const sC = shapes.map(shape => encodeCommandList(shape));

        // Encode holes (if any)
        const hC = holes.length > 0
            ? holes.map(hole => encodeCommandList(hole))
            : undefined;

        // Get bounding box
        const bbox = glyph.getBoundingBox();

        const glyphSpec = {
            sC,
            xMin: Math.round(bbox.x1 * scale),
            xMax: Math.round(bbox.x2 * scale),
            yMin: Math.round(bbox.y1 * scale),
            yMax: Math.round(bbox.y2 * scale),
            wdth: Math.round(glyph.advanceWidth * scale)
        };

        if (hC) {
            glyphSpec.hC = hC;
        }

        fontSpec[char] = glyphSpec;
        convertedCount++;
    }

    console.log(`  Converted: ${convertedCount} glyphs`);
    console.log(`  Skipped: ${skippedCount} (not in font or empty)`);

    return fontSpec;
}

/**
 * Generate ES module source code for a font
 * @param {object} fontSpec - MeshWriter font specification
 * @param {string} fontName - Name for the font
 * @returns {string} - ES module source code
 */
export function generateFontModule(fontSpec, fontName) {
    const lines = [
        '/**',
        ` * ${fontName} Font for MeshWriter`,
        ' * Auto-generated - do not edit manually',
        ' * @type {import("meshwriter").FontSpec}',
        ' */',
        'export default {'
    ];

    // Add metadata
    lines.push(`    reverseHoles: ${fontSpec.reverseHoles},`);
    lines.push(`    reverseShapes: ${fontSpec.reverseShapes},`);

    // Add glyphs
    const glyphEntries = Object.entries(fontSpec)
        .filter(([key]) => key !== 'reverseHoles' && key !== 'reverseShapes');

    for (let i = 0; i < glyphEntries.length; i++) {
        const [char, glyph] = glyphEntries[i];
        const isLast = i === glyphEntries.length - 1;

        // Escape the character for use as object key
        const escapedChar = escapeChar(char);

        lines.push(`    ${escapedChar}: {`);

        // Shape commands
        if (glyph.sC && glyph.sC.length > 0) {
            if (glyph.sC.length === 1) {
                lines.push(`        sC: [${JSON.stringify(glyph.sC[0])}],`);
            } else {
                lines.push('        sC: [');
                for (const cmd of glyph.sC) {
                    lines.push(`            ${JSON.stringify(cmd)},`);
                }
                lines.push('        ],');
            }
        } else {
            lines.push('        sC: [],');
        }

        // Hole commands (if present)
        if (glyph.hC && glyph.hC.length > 0) {
            if (glyph.hC.length === 1) {
                lines.push(`        hC: [${JSON.stringify(glyph.hC[0])}],`);
            } else {
                lines.push('        hC: [');
                for (const cmd of glyph.hC) {
                    lines.push(`            ${JSON.stringify(cmd)},`);
                }
                lines.push('        ],');
            }
        }

        // Metrics
        lines.push(`        xMin: ${glyph.xMin},`);
        lines.push(`        xMax: ${glyph.xMax},`);
        lines.push(`        yMin: ${glyph.yMin},`);
        lines.push(`        yMax: ${glyph.yMax},`);
        lines.push(`        wdth: ${glyph.wdth}`);

        lines.push(`    }${isLast ? '' : ','}`);
    }

    lines.push('};');
    lines.push('');

    return lines.join('\n');
}

/**
 * Escape a character for use as an object key in JavaScript
 */
function escapeChar(char) {
    const code = char.charCodeAt(0);

    // Special cases that need quoting
    if (char === '"') return `'"'`;
    if (char === "'") return `"'"`;
    if (char === '\\') return `"\\\\"`;
    if (char === '\n') return `"\\n"`;
    if (char === '\r') return `"\\r"`;
    if (char === '\t') return `"\\t"`;

    // Non-printable or extended characters - use Unicode escape
    if (code < 32 || code > 126) {
        if (code > 0xFFFF) {
            return `"\\u{${code.toString(16)}}"`;
        }
        return `"\\u${code.toString(16).padStart(4, '0')}"`;
    }

    // Printable ASCII - quote it for consistency
    return `"${char}"`;
}

/**
 * Convert a font file and write the output module
 * @param {string} inputPath - Path to TTF/OTF file
 * @param {string} outputPath - Path for output JS file
 * @param {object} options - Conversion options
 */
export async function convertFontToModule(inputPath, outputPath, options = {}) {
    const fontSpec = await convertFont(inputPath, options);
    const fontName = options.name || 'Font';
    const moduleSource = generateFontModule(fontSpec, fontName);

    writeFileSync(outputPath, moduleSource, 'utf-8');
    console.log(`  Output: ${outputPath}`);

    return fontSpec;
}
