/**
 * TextFogPlugin - MaterialPluginBase that applies fog to emissive color
 *
 * Babylon's standard fog only affects diffuse/ambient channels.
 * This plugin recalculates fog blending for the final color output,
 * ensuring emissive text fades properly with distance fog.
 */

import { MaterialPluginBase } from './babylonImports.js';

/**
 * Plugin that applies scene fog to text materials by modifying
 * the final fragment color before output.
 */
export class TextFogPlugin extends MaterialPluginBase {
    /**
     * @param {import('@babylonjs/core/Materials/material').Material} material
     */
    constructor(material) {
        var priority = 300; // Run after standard material processing
        var defines = { 'MESHWRITER_TEXT_FOG': false };
        super(material, 'TextFogPlugin', priority, defines);
        this._enable(true);
    }

    /**
     * Set the define based on whether scene fog is enabled
     * @param {object} defines
     * @param {import('@babylonjs/core/scene').Scene} scene
     * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh
     */
    prepareDefines(defines, scene, mesh) {
        // Enable when scene has any fog mode set (1=LINEAR, 2=EXP, 3=EXP2)
        defines['MESHWRITER_TEXT_FOG'] = scene.fogMode !== 0;
    }

    getClassName() {
        return 'TextFogPlugin';
    }

    getUniforms() {
        // We use Babylon's built-in fog uniforms (vFogInfos, vFogColor)
        // which are already available in the standard material
        return { ubo: [] };
    }

    /**
     * Clean up the plugin
     */
    dispose() {
        super.dispose();
    }

    /**
     * Inject shader code to apply fog to emissive color
     * @param {string} shaderType - 'vertex' or 'fragment'
     */
    getCustomCode(shaderType) {
        if (shaderType === 'fragment') {
            return {
                // This injection point runs just before gl_FragColor is finalized
                // At this point, standard fog has been applied to diffuse/ambient
                // but emissive contribution bypasses fog, so we re-apply fog
                // to the entire output to properly fade text into fog
                'CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR': `
                    #ifdef MESHWRITER_TEXT_FOG
                    #ifdef FOG
                    // Recalculate fog for the full fragment color including emissive
                    // vFogInfos: x=fogMode, y=fogStart, z=fogEnd, w=fogDensity
                    // vFogColor: fog RGB color
                    // vFogDistance: vec3 distance from camera (set by vertex shader)

                    float textFogFactor = 1.0;
                    float textFogDist = length(vFogDistance);

                    if (FOGMODE_LINEAR == vFogInfos.x) {
                        // Linear fog: factor = (end - dist) / (end - start)
                        textFogFactor = clamp((vFogInfos.z - textFogDist) / (vFogInfos.z - vFogInfos.y), 0.0, 1.0);
                    } else if (FOGMODE_EXP == vFogInfos.x) {
                        // Exponential fog: factor = exp(-dist * density)
                        textFogFactor = clamp(exp(-textFogDist * vFogInfos.w), 0.0, 1.0);
                    } else if (FOGMODE_EXP2 == vFogInfos.x) {
                        // Exponential squared fog: factor = exp(-(dist * density)^2)
                        float fogDistDensity = textFogDist * vFogInfos.w;
                        textFogFactor = clamp(exp(-fogDistDensity * fogDistDensity), 0.0, 1.0);
                    }

                    // Blend the entire fragment (including emissive) toward fog color
                    // textFogFactor: 1.0 = no fog (full color), 0.0 = full fog
                    color.rgb = mix(vFogColor, color.rgb, textFogFactor);
                    #endif
                    #endif
                `,
            };
        }
        return null;
    }
}
