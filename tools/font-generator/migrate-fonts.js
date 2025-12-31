#!/usr/bin/env node

/**
 * Migrate existing MeshWriter fonts from factory format to pre-initialized FontSpec
 *
 * This script converts fonts from:
 *   export default function(codeList) { ... return font; }
 * To:
 *   export default { reverseHoles: false, reverseShapes: true, ... }
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FONTS_DIR = join(__dirname, '..', '..', 'fonts');

// Dummy codeList function (fonts don't actually use the parameter)
function codeList(list) {
    return '';
}

async function migrateFont(filename) {
    const filepath = join(FONTS_DIR, filename);
    const fontName = filename.replace('.js', '');

    console.log(`\nMigrating: ${filename}`);

    // Import the font module
    const fontModule = await import(filepath);
    const fontFactory = fontModule.default;

    if (typeof fontFactory !== 'function') {
        console.log(`  Skipping: already migrated or not a factory function`);
        return false;
    }

    // Execute factory to get font spec
    const fontSpec = fontFactory(codeList);

    // Generate new module source
    const lines = [
        '/**',
        ` * ${fontName.charAt(0).toUpperCase() + fontName.slice(1)} Font for MeshWriter`,
        ' * Pre-initialized FontSpec format',
        ' * @type {import("../src/types").FontSpec}',
        ' */',
        'export default {'
    ];

    // Add metadata
    lines.push(`    reverseHoles: ${fontSpec.reverseHoles},`);
    lines.push(`    reverseShapes: ${fontSpec.reverseShapes},`);

    // Get all glyph entries
    const glyphEntries = Object.entries(fontSpec)
        .filter(([key]) => key !== 'reverseHoles' && key !== 'reverseShapes');

    console.log(`  Glyphs: ${glyphEntries.length}`);

    for (let i = 0; i < glyphEntries.length; i++) {
        const [char, glyph] = glyphEntries[i];
        const isLast = i === glyphEntries.length - 1;

        // Escape the character for use as object key
        const escapedChar = escapeChar(char);

        lines.push(`    ${escapedChar}: {`);

        // Shape commands
        if (glyph.sC && glyph.sC.length > 0) {
            lines.push('        sC: [');
            for (const cmd of glyph.sC) {
                lines.push(`            ${JSON.stringify(cmd)},`);
            }
            lines.push('        ],');
        } else {
            lines.push('        sC: [],');
        }

        // Hole commands (if present)
        if (glyph.hC && glyph.hC.length > 0) {
            lines.push('        hC: [');
            for (const cmd of glyph.hC) {
                lines.push(`            ${JSON.stringify(cmd)},`);
            }
            lines.push('        ],');
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

    // Write the new file
    const newSource = lines.join('\n');
    writeFileSync(filepath, newSource, 'utf-8');

    console.log(`  Migrated successfully`);
    return true;
}

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

async function main() {
    console.log('MeshWriter Font Migration Tool');
    console.log('==============================');
    console.log(`\nFonts directory: ${FONTS_DIR}`);

    // Get all font files (excluding index.js)
    const fontFiles = readdirSync(FONTS_DIR)
        .filter(f => f.endsWith('.js') && f !== 'index.js');

    console.log(`Found ${fontFiles.length} font file(s)`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const file of fontFiles) {
        try {
            const migrated = await migrateFont(file);
            if (migrated) {
                migratedCount++;
            } else {
                skippedCount++;
            }
        } catch (error) {
            console.error(`  Error: ${error.message}`);
            skippedCount++;
        }
    }

    console.log(`\n==============================`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
}

main().catch(console.error);
