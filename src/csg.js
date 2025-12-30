/**
 * MeshWriter CSG Module
 * Handles CSG version detection, async initialization, and ready state management
 */

import { isObject, isPromiseLike } from './utils.js';
import {
    CSG as BabylonCSG,
    CSG2 as BabylonCSG2,
    InitializeCSG2Async as BabylonInitializeCSG2Async,
    IsCSG2Ready as BabylonIsCSG2Ready
} from './babylonImports.js';

// CSG libraries - initialized from Babylon imports or external source
let CSG = BabylonCSG;
let CSG2 = BabylonCSG2;
let InitializeCSG2Async = BabylonInitializeCSG2Async;
let IsCSG2Ready = BabylonIsCSG2Ready;

// State
let csgVersion = null;        // 'CSG2', 'CSG', or null
let csgReady = false;
const csgReadyListeners = [];
let externalCSGInitializer = null;
let externalCSGReadyCheck = null;

/**
 * Initialize CSG module with Babylon.js CSG classes
 * Must be called before using any CSG functionality
 * @param {Object} babylon - Object containing CSG, CSG2, InitializeCSG2Async, IsCSG2Ready
 */
export function initCSGModule(babylon) {
    if (isObject(babylon)) {
        CSG = babylon.CSG || null;
        CSG2 = babylon.CSG2 || null;
        InitializeCSG2Async = babylon.InitializeCSG2Async || null;
        IsCSG2Ready = babylon.IsCSG2Ready || null;
    }
    csgVersion = detectCSGVersion();

    // Legacy CSG is immediately ready
    if (csgVersion === 'CSG') {
        markCSGInitialized();
    } else if (csgVersion === 'CSG2') {
        // Check if CSG2 is already initialized
        csgReady = false;
        if (runCSGReadyCheck()) {
            markCSGInitialized();
        }
    }
}

/**
 * Detect which CSG implementation is available
 * @returns {'CSG2'|'CSG'|null}
 */
export function detectCSGVersion() {
    // Prefer CSG2 (Babylon 7.31+)
    if (isObject(CSG2) && typeof InitializeCSG2Async === 'function') {
        return 'CSG2';
    }
    // Fall back to legacy CSG
    if (isObject(CSG) && typeof CSG.FromMesh === 'function') {
        return 'CSG';
    }
    return null;
}

/**
 * Mark CSG as ready and notify all listeners
 */
export function markCSGInitialized() {
    if (csgReady) {
        return;
    }
    csgReady = true;

    // Notify all waiting listeners
    if (csgReadyListeners.length) {
        csgReadyListeners.splice(0).forEach(function(listener) {
            try {
                listener();
            } catch (err) {
                console.error("MeshWriter: onCSGReady listener failed", err);
            }
        });
    }
}

/**
 * Check if CSG is ready for use
 * @returns {boolean}
 */
export function isCSGReady() {
    if (csgVersion === 'CSG2') {
        refreshCSGReadyState();
        return csgReady;
    }
    return csgVersion === 'CSG';
}

/**
 * Refresh CSG2 ready state from external checks
 */
function refreshCSGReadyState() {
    if (csgVersion !== 'CSG2' || csgReady) {
        return;
    }
    if (runCSGReadyCheck()) {
        markCSGInitialized();
    }
}

/**
 * Run CSG ready check (external or native)
 */
function runCSGReadyCheck() {
    // Try external ready check first
    if (typeof externalCSGReadyCheck === "function") {
        try {
            if (externalCSGReadyCheck()) {
                return true;
            }
        } catch (err) {
            console.warn("MeshWriter: external CSG ready check failed", err);
        }
    }

    // Check native IsCSG2Ready
    if (typeof IsCSG2Ready === "function" && IsCSG2Ready()) {
        return true;
    }

    return false;
}

/**
 * Initialize CSG2 asynchronously
 * @returns {Promise<void>}
 */
export async function initializeCSG2() {
    if (csgVersion !== 'CSG2') {
        return;
    }
    if (csgReady) {
        return;
    }

    const initializer = externalCSGInitializer || InitializeCSG2Async;
    if (typeof initializer !== "function") {
        throw new Error(
            "MeshWriter: No CSG2 initializer available. " +
            "Use MeshWriter.setCSGInitializer() or ensure BABYLON.InitializeCSG2Async is available."
        );
    }

    const result = initializer();
    if (isPromiseLike(result)) {
        await result;
    }
    markCSGInitialized();
}

// Public API

/**
 * Get the current CSG version being used
 * @returns {'CSG2'|'CSG'|null}
 */
export function getCSGVersion() {
    return csgVersion;
}

/**
 * Set an external CSG2 initializer function
 * @param {Function} fn - Async function that initializes CSG2
 */
export function setCSGInitializer(fn) {
    if (typeof fn === "function") {
        externalCSGInitializer = fn;
    }
}

/**
 * Set an external CSG2 ready check function
 * @param {Function} fn - Function that returns true when CSG2 is ready
 */
export function setCSGReadyCheck(fn) {
    if (typeof fn === "function") {
        externalCSGReadyCheck = fn;
        refreshCSGReadyState();
    }
}

/**
 * Register a callback to be called when CSG is ready
 * If CSG is already ready, callback is called immediately
 * @param {Function} listener
 */
export function onCSGReady(listener) {
    if (typeof listener !== "function") {
        return;
    }
    if (isCSGReady()) {
        listener();
    } else {
        csgReadyListeners.push(listener);
    }
}

/**
 * Get the CSG library to use for operations
 * @returns {Object} - CSG or CSG2 class
 */
export function getCSGLib() {
    return csgVersion === 'CSG2' ? CSG2 : CSG;
}

// Export for direct access when needed
export { CSG, CSG2 };
