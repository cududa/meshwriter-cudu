/**
 * MeshWriter Curve Extensions
 * Optimized Path2 curve methods for better performance
 */

import { Path2, Curve3, Vector3 } from './babylonImports.js';

/**
 * Extended Path2 interface with MeshWriter curve methods
 * @typedef {Object} Path2Extensions
 * @property {(redX: number, redY: number, blueX: number, blueY: number) => Path2} addQuadraticCurveTo
 * @property {(redX: number, redY: number, greenX: number, greenY: number, blueX: number, blueY: number) => Path2} addCubicCurveTo
 */

// Optimized segment count for curves
// Native Babylon 6+ uses 36 segments which causes slowdown
// MeshWriter uses 6 for better performance
export const curveSampleSize = 6;

/**
 * Install optimized curve methods on Path2 prototype
 * Must be called after Babylon.js is loaded
 */
export function installCurveExtensions() {
    if (!Path2 || !Path2.prototype) {
        return;
    }

    /** @type {any} */
    const proto = Path2.prototype;

    // Quadratic Bezier with optimized segment count
    proto.addQuadraticCurveTo = function(redX, redY, blueX, blueY) {
        const points = this.getPoints();
        const lastPoint = points[points.length - 1];
        const origin = new Vector3(lastPoint.x, lastPoint.y, 0);
        const control = new Vector3(redX, redY, 0);
        const destination = new Vector3(blueX, blueY, 0);

        const curve = Curve3.CreateQuadraticBezier(origin, control, destination, curveSampleSize);
        const curvePoints = curve.getPoints();

        for (let i = 1; i < curvePoints.length; i++) {
            this.addLineTo(curvePoints[i].x, curvePoints[i].y);
        }
        return this; // Return this for method chaining
    };

    // Cubic Bezier with optimized segment count
    proto.addCubicCurveTo = function(redX, redY, greenX, greenY, blueX, blueY) {
        const points = this.getPoints();
        const lastPoint = points[points.length - 1];
        const origin = new Vector3(lastPoint.x, lastPoint.y, 0);
        const control1 = new Vector3(redX, redY, 0);
        const control2 = new Vector3(greenX, greenY, 0);
        const destination = new Vector3(blueX, blueY, 0);

        const nbPoints = Math.floor(0.3 + curveSampleSize * 1.5);
        const curve = Curve3.CreateCubicBezier(origin, control1, control2, destination, nbPoints);
        const curvePoints = curve.getPoints();

        for (let i = 1; i < curvePoints.length; i++) {
            this.addLineTo(curvePoints[i].x, curvePoints[i].y);
        }
        return this; // Return this for method chaining
    };
}
