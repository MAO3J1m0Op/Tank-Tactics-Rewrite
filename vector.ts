/**
 * Used for board sizes and positions.
 */
export interface Vector {
    x: number
    y: number
}

/**
 * Adds two vectors and returns a new vector object.
 * @param a the first vector.
 * @param b the second vector.
 * @returns a new third resultant vector.
 */
export function addVectors(a: Vector, b: Vector): Vector {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

/**
 * Return a new vector which is one vector scaled by another.
 * @param vector the vector to scale.
 * @param scalar the amount by which the vector will be scaled.
 * @returns a new resultant vector.
 */
export function scaleVector(vector: Vector, scalar: number): Vector {
    return {
        x: vector.x * scalar,
        y: vector.y * scalar
    }
}
