import { User } from 'discord.js'
import { TankPattern } from './board'
import { Vector, compare } from './vector'

/**
 * Data for a single player in a game while the game is awaiting players to
 * join.
 */
export interface PlayerData {
    /**
     * Unique pattern of the player's tank.
     */
    pattern: TankPattern
}

/**
 * Date for a single player in an active game.
 */
export interface ActivePlayerData extends PlayerData {
    /**
     * Position of the player's tank.
     */
    position: Vector
    /**
     * Number of actions this player can make.
     */
    actions: number
    /**
     * Health of the player's tank.
     */
    health: number
}

/**
 * Format of a game JSON file that is awaiting players to join.
 */
export interface Game {
    /**
     * The ID of the channel that manages this game.
     */
    channelId: string
    /**
     * Player ID of this game's game master.
     */
    gameMaster: string
    /**
     * Object mapping the ID of players to their data.
     */
    players: {
        [userId: string]: PlayerData
    }
    /**
     * List of player IDs of jurors.
     */
    jury: string[]
}

/**
 * Game that is in play.
 */
export interface ActiveGame extends Game {
    /**
     * The date the game began.
     */
    startDate: string
    /**
     * Object mapping the ID of players to their data.
     */
    players: {
        [userId: string]: ActivePlayerData
    }
    /**
     * Size of the board.
     */
    boardSize: Vector
}

/**
 * Checks if a given game is active.
 * @param game the game to check.
 */
export function activeGame(game: Game): game is ActiveGame {
    // The game will have a start date
    return (game as ActiveGame).startDate !== undefined
}

/**
 * Checks if a given user is a player in the passed game.
 * @param game the game being checked.
 * @param user the user to check.
 */
export function userIsPlayer(game: Game, user: User): boolean {
    return Object.keys(game.players).includes(user.id)
}

/**
 * Checks if a given user is the GM of the passed game.
 * @param game the game being checked.
 * @param user the user to check.
 */
export function userIsGM(game: Game, user: User): boolean {
    return game.gameMaster === user.id
}

/**
 * Checks if a given user is a juror in the passed game.
 * @param game the game being checked.
 * @param user the user to check.
 */
export function userIsJuror(game: ActiveGame, user: User): boolean {
    return game.jury.includes(user.id)
}

/**
 * Gets the player who is at a specified position.
 * @param game the game whose board will be checked.
 * @param position the position to check.
 * @returns the ID of the player at the specified position, or undefined if the
 * space is empty.
 */
export function tankAt(
    game: ActiveGame, 
    position: Vector
): string | undefined {

    // Find the player with a tank at the position
    const playerEntry = Object.entries(game.players)
        .find(entry => compare(entry[1].position, position))

    return playerEntry !== undefined ? playerEntry[0] : undefined
}

/**
 * Checks if a pattern is unique in a game.
 * @param game the game to read from.
 * @param pattern the pattern to check.
 */
export function patternIsUnique(game: Game, pattern: TankPattern): boolean {

    const copyingPlayer = Object.values(game.players)
        .find(player => 
            pattern.kind === player.pattern.kind
            && pattern.primary === player.pattern.primary
            && pattern.secondary === player.pattern.secondary)

    return copyingPlayer === undefined
}
