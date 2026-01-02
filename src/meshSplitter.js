import { Mesh, VertexData } from './babylonImports.js'

/**
 * Split a mesh into two meshes: emissive face geometry and lit rim geometry.
 * @param {import('@babylonjs/core').Mesh} mesh
 * @param {import('@babylonjs/core').Scene} scene
 * @returns {{ rimMesh: import('@babylonjs/core').Mesh, faceMesh: import('@babylonjs/core').Mesh | null }}
 */
export function splitMeshByFaceNormals(mesh, scene) {
    var geometry = mesh.geometry
    if (!geometry) {
        return { rimMesh: mesh, faceMesh: null }
    }

    var positions = geometry.getVerticesData('position')
    var normals = geometry.getVerticesData('normal')
    var uvs = geometry.getVerticesData('uv')
    var indices = geometry.getIndices()

    if (!positions || !normals || !indices || positions.length === 0) {
        return { rimMesh: mesh, faceMesh: null }
    }

    var faceData = createEmptyData()
    var rimData = createEmptyData()

    var axisInfo = detectFaceAxisFromGeometry(positions, normals, indices)
    if (!axisInfo) {
        axisInfo = detectFaceAxis(normals)
    }
    if (!axisInfo) {
        axisInfo = detectExtrudeAxisFromPositions(positions)
    }

    for (var i = 0; i < indices.length; i += 3) {
        var i0 = indices[i]
        var i1 = indices[i + 1]
        var i2 = indices[i + 2]
        var isFace = triangleIsFrontFace(i0, i1, i2, positions, normals, axisInfo)
        var target = isFace ? faceData : rimData
        var v0 = appendVertex(target, i0, positions, normals, uvs)
        var v1 = appendVertex(target, i1, positions, normals, uvs)
        var v2 = appendVertex(target, i2, positions, normals, uvs)
        target.indices.push(v0, v1, v2)
    }

    mesh.dispose()

    var rimMesh = buildMesh(mesh.name + '_rim', rimData, scene)
    var faceMesh = buildMesh(mesh.name + '_face', faceData, scene)

    if (!faceMesh) {
        return { rimMesh: rimMesh || mesh, faceMesh: null }
    }
    if (!rimMesh) {
        return { rimMesh: faceMesh, faceMesh: null }
    }
    return { rimMesh, faceMesh }
}

function detectFaceAxisFromGeometry(positions, normals, indices) {
    if (!positions || !indices) return null

    var min = [Infinity, Infinity, Infinity]
    var max = [-Infinity, -Infinity, -Infinity]
    for (var i = 0; i < positions.length; i += 3) {
        var x = positions[i]
        var y = positions[i + 1]
        var z = positions[i + 2]
        if (x < min[0]) min[0] = x
        if (x > max[0]) max[0] = x
        if (y < min[1]) min[1] = y
        if (y > max[1]) max[1] = y
        if (z < min[2]) min[2] = z
        if (z > max[2]) max[2] = z
    }

    var epsilons = [
        Math.max((max[0] - min[0]) * 0.15, 0.001),
        Math.max((max[1] - min[1]) * 0.15, 0.001),
        Math.max((max[2] - min[2]) * 0.15, 0.001)
    ]

    var counts = [
        { min: 0, max: 0, sumMin: 0, sumMax: 0 },
        { min: 0, max: 0, sumMin: 0, sumMax: 0 },
        { min: 0, max: 0, sumMin: 0, sumMax: 0 }
    ]

    for (var idx = 0; idx < indices.length; idx += 3) {
        var i0 = indices[idx]
        var i1 = indices[idx + 1]
        var i2 = indices[idx + 2]

        for (var axis = 0; axis < 3; axis++) {
            var epsilon = epsilons[axis]
            if (epsilon <= 0) continue
            var minVal = min[axis]
            var maxVal = max[axis]

            var c0 = positions[i0 * 3 + axis]
            var c1 = positions[i1 * 3 + axis]
            var c2 = positions[i2 * 3 + axis]

            var nearMin = Math.abs(c0 - minVal) < epsilon &&
                Math.abs(c1 - minVal) < epsilon &&
                Math.abs(c2 - minVal) < epsilon
            var nearMax = Math.abs(c0 - maxVal) < epsilon &&
                Math.abs(c1 - maxVal) < epsilon &&
                Math.abs(c2 - maxVal) < epsilon

            if (nearMin) {
                counts[axis].min++
                if (normals) {
                    counts[axis].sumMin += normals[i0 * 3 + axis] + normals[i1 * 3 + axis] + normals[i2 * 3 + axis]
                }
            } else if (nearMax) {
                counts[axis].max++
                if (normals) {
                    counts[axis].sumMax += normals[i0 * 3 + axis] + normals[i1 * 3 + axis] + normals[i2 * 3 + axis]
                }
            }
        }
    }

    var bestAxis = -1
    var bestCount = 0
    for (var axisIdx = 0; axisIdx < 3; axisIdx++) {
        var total = counts[axisIdx].min + counts[axisIdx].max
        if (total > bestCount) {
            bestCount = total
            bestAxis = axisIdx
        }
    }

    if (bestAxis === -1 || bestCount === 0) {
        return null
    }

    // For 3D text, extrusion is typically along Y axis (axis=1).
    // If Y axis has any face triangles and the detected axis is different,
    // prefer Y unless the detected axis has significantly more triangles.
    var yTotal = counts[1].min + counts[1].max
    if (bestAxis !== 1 && yTotal > 0) {
        // Only switch away from Y if another axis has 2x more triangles
        if (bestCount < yTotal * 2) {
            bestAxis = 1
            bestCount = yTotal
        }
    }

    var chosen = counts[bestAxis]
    var frontSide
    // For extruded text, the front face is always at the 'max' position of the
    // extrusion axis (Y=0 for text at Y=[-depth, 0]). Use triangle count to pick
    // the side with more face geometry, defaulting to 'max'.
    if (chosen.max >= chosen.min) {
        frontSide = 'max'
    } else {
        frontSide = 'min'
    }

    return {
        axis: bestAxis,
        strategy: 'positions',
        min: min[bestAxis],
        max: max[bestAxis],
        epsilon: epsilons[bestAxis],
        frontSide
    }
}

function detectFaceAxis(normals) {
    if (!normals || normals.length === 0) {
        return null
    }
    var sumsAbs = [0, 0, 0]
    var sumsSigned = [0, 0, 0]
    for (var i = 0; i < normals.length; i += 3) {
        var nx = normals[i]
        var ny = normals[i + 1]
        var nz = normals[i + 2]
        sumsAbs[0] += Math.abs(nx)
        sumsAbs[1] += Math.abs(ny)
        sumsAbs[2] += Math.abs(nz)
        sumsSigned[0] += nx
        sumsSigned[1] += ny
        sumsSigned[2] += nz
    }
    var axis = 0
    var maxSum = sumsAbs[0]
    for (var j = 1; j < 3; j++) {
        if (sumsAbs[j] > maxSum) {
            maxSum = sumsAbs[j]
            axis = j
        }
    }
    if (maxSum === 0) {
        return null
    }
    var frontSign = sumsSigned[axis] >= 0 ? 1 : -1
    return {
        axis,
        frontSign,
        strategy: 'normals',
        min: 0,
        max: 0,
        epsilon: 0,
        frontSide: 'max'
    }
}

function detectExtrudeAxisFromPositions(positions) {
    if (!positions || positions.length === 0) {
        return null
    }
    var min = [Infinity, Infinity, Infinity]
    var max = [-Infinity, -Infinity, -Infinity]
    for (var i = 0; i < positions.length; i += 3) {
        var x = positions[i]
        var y = positions[i + 1]
        var z = positions[i + 2]
        if (x < min[0]) min[0] = x
        if (x > max[0]) max[0] = x
        if (y < min[1]) min[1] = y
        if (y > max[1]) max[1] = y
        if (z < min[2]) min[2] = z
        if (z > max[2]) max[2] = z
    }
    var ranges = [
        max[0] - min[0],
        max[1] - min[1],
        max[2] - min[2]
    ]
    var axis = 0
    var minRange = ranges[0]
    for (var j = 1; j < 3; j++) {
        if (ranges[j] < minRange) {
            minRange = ranges[j]
            axis = j
        }
    }
    var epsilon = Math.max(minRange * 0.05, 0.0001)
    return {
        axis,
        strategy: 'positions',
        min: min[axis],
        max: max[axis],
        epsilon,
        frontSide: 'max'
    }
}

function triangleIsFrontFace(i0, i1, i2, positions, normals, axisInfo) {
    if (!axisInfo) return false
    var axis = axisInfo.axis || 1

    if (axisInfo.strategy === 'normals' && normals) {
        var frontSign = axisInfo.frontSign || 1
        var threshold = 0.5
        var n0 = normals[i0 * 3 + axis] * frontSign
        var n1 = normals[i1 * 3 + axis] * frontSign
        var n2 = normals[i2 * 3 + axis] * frontSign
        return (n0 > threshold && n1 > threshold && n2 > threshold)
    }

    if (axisInfo.strategy === 'positions' && positions) {
        var epsilon = axisInfo.epsilon
        var limitVal = axisInfo.frontSide === 'min' ? axisInfo.min : axisInfo.max
        var c0 = positions[i0 * 3 + axis]
        var c1 = positions[i1 * 3 + axis]
        var c2 = positions[i2 * 3 + axis]
        return (
            Math.abs(c0 - limitVal) < epsilon &&
            Math.abs(c1 - limitVal) < epsilon &&
            Math.abs(c2 - limitVal) < epsilon
        )
    }

    return false
}

function createEmptyData() {
    return {
        positions: [],
        normals: [],
        uvs: [],
        indices: [],
        nextIndex: 0
    }
}

function appendVertex(target, originalIndex, positions, normals, uvs) {
    var posOffset = originalIndex * 3
    var uvOffset = originalIndex * 2

    target.positions.push(
        positions[posOffset],
        positions[posOffset + 1],
        positions[posOffset + 2]
    )
    target.normals.push(
        normals[posOffset],
        normals[posOffset + 1],
        normals[posOffset + 2]
    )

    if (uvs && uvs.length) {
        target.uvs.push(uvs[uvOffset], uvs[uvOffset + 1])
    } else {
        target.uvs.push(0, 0)
    }

    var newIndex = target.nextIndex
    target.nextIndex += 1
    return newIndex
}

function buildMesh(name, data, scene) {
    if (!data.positions.length) return null
    var newMesh = new Mesh(name, scene)
    var vertexData = new VertexData()
    vertexData.positions = data.positions
    vertexData.normals = data.normals
    vertexData.indices = data.indices
    vertexData.uvs = data.uvs
    vertexData.applyToMesh(newMesh, true)
    newMesh.refreshBoundingInfo()
    return newMesh
}
