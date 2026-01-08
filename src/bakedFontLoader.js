/**
 * MeshWriter Baked Font Loader
 * Loads pre-baked FontSpec JSON files at runtime.
 * Zero dependencies - just fetch and use.
 */

/**
 * Load a pre-baked font from a JSON file
 * @param {string} url - URL to the baked FontSpec JSON file
 * @returns {Promise<object>} - FontSpec object ready for use with MeshWriter
 *
 * @example
 * const fontSpec = await loadBakedFont('/fonts/baked/atkinson-hyperlegible-next-400.json');
 * registerFont('Atkinson400', fontSpec);
 */
export async function loadBakedFont(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`MeshWriter: Failed to load baked font from ${url} (HTTP ${response.status})`);
    }

    const fontSpec = await response.json();

    // Validate it looks like a FontSpec
    if (typeof fontSpec !== 'object' || fontSpec === null) {
        throw new Error(`MeshWriter: Invalid baked font data from ${url}`);
    }

    return fontSpec;
}

/**
 * Load multiple pre-baked weights from a manifest
 * @param {string} manifestUrl - URL to the manifest.json file
 * @param {number[]} [weights] - Specific weights to load (loads all if omitted)
 * @returns {Promise<Map<number, object>>} - Map of weight -> FontSpec
 *
 * @example
 * const fonts = await loadBakedFontsFromManifest('/fonts/baked/manifest.json', [400, 450]);
 * const fontSpec = fonts.get(400);
 */
export async function loadBakedFontsFromManifest(manifestUrl, weights) {
    const response = await fetch(manifestUrl);

    if (!response.ok) {
        throw new Error(`MeshWriter: Failed to load manifest from ${manifestUrl} (HTTP ${response.status})`);
    }

    const manifest = await response.json();
    const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1);

    // Determine which weights to load
    const weightsToLoad = weights
        ? weights.filter(w => manifest.weights.includes(w))
        : manifest.weights;

    if (weights && weightsToLoad.length !== weights.length) {
        const missing = weights.filter(w => !manifest.weights.includes(w));
        console.warn(`MeshWriter: Requested weights not available: ${missing.join(', ')}`);
        console.warn(`MeshWriter: Available weights: ${manifest.weights.join(', ')}`);
    }

    // Load all requested weights in parallel
    const results = await Promise.all(
        weightsToLoad.map(async (weight) => {
            const idx = manifest.weights.indexOf(weight);
            const file = manifest.files[idx];
            const fontSpec = await loadBakedFont(baseUrl + file);
            return { weight, fontSpec };
        })
    );

    // Build map
    const fontMap = new Map();
    for (const { weight, fontSpec } of results) {
        fontMap.set(weight, fontSpec);
    }

    return fontMap;
}

/**
 * Find the nearest available weight from a set of baked weights
 * @param {number} targetWeight - Desired weight
 * @param {number[]} availableWeights - Array of available weights
 * @returns {number} - Nearest available weight
 *
 * @example
 * const nearest = findNearestWeight(425, [400, 450, 500]);
 * // Returns 450 (closest to 425)
 */
export function findNearestWeight(targetWeight, availableWeights) {
    if (!availableWeights || availableWeights.length === 0) {
        throw new Error('MeshWriter: No available weights provided');
    }

    let nearest = availableWeights[0];
    let minDiff = Math.abs(targetWeight - nearest);

    for (const weight of availableWeights) {
        const diff = Math.abs(targetWeight - weight);
        if (diff < minDiff) {
            minDiff = diff;
            nearest = weight;
        }
    }

    return nearest;
}

/**
 * Get manifest info without loading fonts
 * @param {string} manifestUrl - URL to the manifest.json file
 * @returns {Promise<object>} - Manifest object with fontName, weights, etc.
 */
export async function getBakedFontManifest(manifestUrl) {
    const response = await fetch(manifestUrl);

    if (!response.ok) {
        throw new Error(`MeshWriter: Failed to load manifest from ${manifestUrl} (HTTP ${response.status})`);
    }

    return response.json();
}
