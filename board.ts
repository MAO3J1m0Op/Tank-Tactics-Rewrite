import Jimp from 'jimp'
import { access } from 'fs/promises'
import { colors, patterns } from './patterns.json'
import { addVectors, scaleVector, Vector, vectorize } from './vector'
import { ActiveGame } from './games'

/**
 * Al permitted colors in a tank pattern.
 */
export type Color = keyof typeof colors
/**
 * CSS color codes for all permitted colors in a tank pattern.
 */
export const colorCodes: { [key in Color]: string } = colors

const colorKeys = Object.keys(colorCodes) as Color[]
/**
 * Returns a random color.
 */
export function randomColor(): Color {
    const i = Math.floor(Math.random() * colorKeys.length)
    return colorKeys[i]
}

/**
 * All permitted kinds of tank patterns.
 */
export type PatternKind = keyof typeof patterns

/**
 * Map of all permitted pattern names to their lengthier names.
 */
// @ts-ignore
export const patternNames: { [key in PatternKind]: string } = {}
for (const patternName in patterns) {
    patternNames[patternName] = patterns[patternName].generic
}

const patternKeys = Object.keys(patternNames) as PatternKind[]
/**
 * Returns a random pattern kind.
 */
export function randomPattern(): PatternKind {
    const i = Math.floor(Math.random() * patternKeys.length)
    return patternKeys[i]
}

/**
 * A pattern that uniquely identifies a tank.
 */
export interface TankPattern {
    primary: Color
    secondary: Color | null
    kind: PatternKind | null
}

/**
 * Displays the full name of a tank pattern.
 */
export function coloredPatternName(pattern: TankPattern): string {

    // Solid patterns
    if (pattern.kind === null) return pattern.primary

    return patterns[pattern.kind].colored
        .replace('$1', pattern.primary)
        .replace('$2', pattern.secondary)
}

const borderColor = '#000000'
const emptyCellColor = '#FFFFFF'
const cellSizePx = 50
const borderWidthPx = 10

/**
 * Class that encapsulates drawing on a board.
 */
export class Board {

    private image: Jimp
    public game: ActiveGame

    /**
     * Gets the path to a game's board image.
     */
    static path(game: ActiveGame): string {
        return `./data/active/${game.channelId}.png`
    }

    private constructor(game: ActiveGame, image: Jimp) {
        this.game = game
        this.image = image
    }

    /**
     * Reads in a board image for a specified game. If no board image exists,
     * it will create a new one.
     * @param game the game the new board will represent.
     */
    static async get(game: ActiveGame): Promise<Board> {

        return access(Board.path(game))
            // The file exists: load it in
            .then(async () => {
                const image = await Jimp.read(Board.path(game))
                return new Board(game, image)
            })

            // The file does not exist: make a new one
            .catch(() => Board.create(game))
    }

    /**
     * Creates a new board image based on the state of the game passed in.
     * @param game the game for which the board will be created.
     */
    static create(game: ActiveGame): Board {

        // Compute the size of the board in pixels
        const numBorders = addVectors(game.boardSize, { x: 1, y: 1 })
        const numBorderPx = scaleVector(numBorders, borderWidthPx)
        const numCellPx = scaleVector(game.boardSize, cellSizePx)
        const boardSizePx = addVectors(numBorderPx, numCellPx)
    
        // Create the image
        const image = new Jimp(
            boardSizePx.x,
            boardSizePx.y,
            borderColor
        )
        const board = new Board(game, image)

        // Draw each empty cell
        for (let x = 0; x < game.boardSize.x; ++x) {
            for (let y = 0; y < game.boardSize.y; ++y) {
                board.fillCell({ x: x, y: y }, emptyCellColor)
            }
        }

        // Call the render function for each tank
        Object.values(game.players).forEach(player => {
            board.renderPattern(player.position, player.pattern)
        })

        return board
    }

    /**
     * Fills a cell with a color.
     * @param cell the cell to fill.
     * @param color the CSS-formatted color to use.
     * @returns this, for chaining.
     */
    fillCell(cell: Vector, color: string): this {
        const pos = scaleVector(cell, cellSizePx + borderWidthPx)
        const size: Vector = { x: cellSizePx, y: cellSizePx }
        fillRectangle(this.image, pos, size, color)
        return this
    }

    /**
     * Renders a pattern in a particular cell.
     * @param cell the cell in which the pattern will be rendered.
     * @param pattern the pattern to render. If not specified, the cell will be
     * emptied.
     * @returns this, for chaining.
     */
    renderPattern(cell: Vector, pattern?: TankPattern): this {
        const renderer = patternRenderers[pattern.kind]
        const pixelPos = scaleVector(cell, cellSizePx + borderWidthPx)
        renderer(this.image, pixelPos, pattern.primary, pattern.secondary)
        return this
    }

    /**
     * Applies the changes done to the image on disk.
     * @returns a promise that resolves once the image has been rendered and
     * written to file.
     */
    async write(): Promise<void> {
        await this.image.writeAsync(Board.path(this.game))
    }
}

/**
 * Fills a rectangle on the provided image with the provided color.
 * @param position pixel position of the top-left corner of the rectangle.
 * @param size size of the rectangle in pixels.
 * @param color CSS-formatted color to use to fill the rectangle.
 */
function fillRectangle(
    image: Jimp,
    position: Vector,
    size: Vector,
    color: string
): Jimp { 
    const colorHex = Jimp.cssColorToHex(color)
    return image.scan(
        position.x, position.y,
        size.x, size.y, 
        function(x, y, offset) {
            this.bitmap.data.writeUint32BE(colorHex, offset)
        }
    )
}

/**
 * Function that draws the pattern on the board image.
 */
type PatternRenderer = (
    /** The image on which the pattern will be rendered.*/
    image: Jimp,
    /** Pixel position of the beginning of the cell. */
    pixelPos: Vector,
    /** Primary color of the pattern. */
    primary: Color,
    /** Secondary color of the pattern. */
    secondary: Color
) => void

const patternRenderers: { [pattern in PatternKind]: PatternRenderer } = {
    checkerboard: (image, pixelPos, primary, secondary) => {
        // Find begin, end, and midpoint pixel positions
        const tileSize = scaleVector(vectorize(cellSizePx), 2)
        const mid = addVectors(pixelPos, tileSize)

        // Fill each rectangle
        fillRectangle(image, pixelPos, tileSize, colorCodes[primary])
        fillRectangle(image, mid, tileSize, colorCodes[primary])
        fillRectangle(image, { x: pixelPos.x, y: mid.y }, tileSize,
            colorCodes[secondary])
        fillRectangle(image, { x: mid.x, y: pixelPos.y }, tileSize,
            colorCodes[secondary])
    },
    split_horiz: () => {},
    split_vert: () => {},
    split_NE_SW: () => {},
    split_NW_SE: () => {},
}
