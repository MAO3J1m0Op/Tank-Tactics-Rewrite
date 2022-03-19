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

export function compare(a: Vector, b: Vector): boolean {
    return a.x === b.x && a.y === b.y
}

/**
 * Returns dimensions for the smallest box that is either N*N or N*(N-1) and has
 * at minimum the area passed..
 * @param area the minimum area of the box.
 */
export function boxiestBox(area: number): Vector {

    // Square-iest length
    const N = Math.ceil(Math.sqrt(area))

    // Shave a layer off the box if allowed
    return (N * (N - 1) > area)
        ? { x: N, y: N - 1 }
        : { x: N, y: N }
}
