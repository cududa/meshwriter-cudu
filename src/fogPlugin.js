/**
 * TextFogPlugin - MaterialPluginBase that applies fog to text materials
 *
 * Since we disable Babylon's built-in fog (material.fogEnabled = false) to avoid
 * double-fogging of diffuse colors, this plugin handles ALL fog application.
 * It supplies its own uniforms and varyings to calculate fog distance and blend.
 *
 * This ensures text (with emissive colors) fades into fog at the same rate as
 * terrain (which uses only diffuse colors with standard fog).
 */

import { MaterialPluginBase } from './babylonImports.js';

/**
 * Plugin that applies scene fog to text materials uniformly.
 * Handles fog for both diffuse and emissive components in one pass.
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
        // This is independent of material.fogEnabled since we handle fog ourselves
        defines['MESHWRITER_TEXT_FOG'] = scene.fogMode !== 0;
    }

    getClassName() {
        return 'TextFogPlugin';
    }

    /**
     * Define our own fog uniforms since material.fogEnabled = false
     * means Babylon's built-in fog uniforms won't be available
     */
    getUniforms() {
        return {
            ubo: [
                { name: 'textFogInfos', size: 4, type: 'vec4' },
                { name: 'textFogColor', size: 3, type: 'vec3' }
            ],
            vertex: '',
            fragment: ''
        };
    }

    /**
     * Bind fog values from the scene to our custom uniforms
     * @param {import('@babylonjs/core/Materials/uniformBuffer').UniformBuffer} uniformBuffer
     * @param {import('@babylonjs/core/scene').Scene} scene
     * @param {import('@babylonjs/core/Engines/engine').Engine} engine
     * @param {import('@babylonjs/core/Meshes/subMesh').SubMesh} subMesh
     */
    bindForSubMesh(uniformBuffer, scene, engine, subMesh) {
        if (scene.fogMode === 0) return;

        // textFogInfos: x=fogMode, y=fogStart, z=fogEnd, w=fogDensity
        uniformBuffer.updateFloat4(
            'textFogInfos',
            scene.fogMode,
            scene.fogStart,
            scene.fogEnd,
            scene.fogDensity
        );

        // textFogColor: RGB color of the fog
        uniformBuffer.updateColor3(
            'textFogColor',
            scene.fogColor
        );
    }

    /**
     * Clean up the plugin
     */
    dispose() {
        super.dispose();
    }

    /**
     * Inject shader code to calculate fog distance and apply fog blending
     * @param {string} shaderType - 'vertex' or 'fragment'
     */
    getCustomCode(shaderType) {
        if (shaderType === 'vertex') {
            return {
                // Declare our varying for fog distance
                'CUSTOM_VERTEX_DEFINITIONS': `
                    #ifdef MESHWRITER_TEXT_FOG
                    varying vec3 textFogDistance;
                    #endif
                `,
                // Calculate fog distance in view space at end of vertex shader
                // finalWorld and positionUpdated are Babylon's built-in variables
                'CUSTOM_VERTEX_MAIN_END': `
                    #ifdef MESHWRITER_TEXT_FOG
                    vec4 textWorldPos = finalWorld * vec4(positionUpdated, 1.0);
                    textFogDistance = (view * textWorldPos).xyz;
                    #endif
                `
            };
        }

        if (shaderType === 'fragment') {
            return {
                // Declare uniforms and varying in fragment shader
                'CUSTOM_FRAGMENT_DEFINITIONS': `
                    #ifdef MESHWRITER_TEXT_FOG
                    uniform vec4 textFogInfos;
                    uniform vec3 textFogColor;
                    varying vec3 textFogDistance;
                    #endif
                `,
                // Apply fog to the entire fragment color before final output
                // This runs just before gl_FragColor is set
                'CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR': `
                    #ifdef MESHWRITER_TEXT_FOG
                    // textFogInfos: x=fogMode, y=fogStart, z=fogEnd, w=fogDensity
                    // Fog modes: 1=LINEAR, 2=EXP, 3=EXP2

                    float textFogFactor = 1.0;
                    float textFogDist = length(textFogDistance);

                    if (textFogInfos.x == 1.0) {
                        // Linear fog: factor = (end - dist) / (end - start)
                        textFogFactor = clamp((textFogInfos.z - textFogDist) / (textFogInfos.z - textFogInfos.y), 0.0, 1.0);
                    } else if (textFogInfos.x == 2.0) {
                        // Exponential fog: factor = exp(-dist * density)
                        textFogFactor = clamp(exp(-textFogDist * textFogInfos.w), 0.0, 1.0);
                    } else if (textFogInfos.x == 3.0) {
                        // Exponential squared fog: factor = exp(-(dist * density)^2)
                        float fogDistDensity = textFogDist * textFogInfos.w;
                        textFogFactor = clamp(exp(-fogDistDensity * fogDistDensity), 0.0, 1.0);
                    }

                    // Blend the entire fragment (diffuse + emissive) toward fog color
                    // textFogFactor: 1.0 = no fog (full color), 0.0 = full fog
                    color.rgb = mix(textFogColor, color.rgb, textFogFactor);
                    #endif
                `
            };
        }

        return null;
    }
}
