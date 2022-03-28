import { TextChannel, User } from 'discord.js'
import { Game, ActiveGame, GameStartOptions } from './games'
import * as fs from 'fs/promises'

let loadedGames: {
    [channelId: string]: Game
} = {}

/**
 * Gets the path to a file for an archived game.
 * @param game game for which the path will be obtained.
 */
function archivePath(game: EndedGame): string {
    return `./data/archive/${game.channelId}.json`
}

/**
 * Pulls the data from all active games into memory.
 */
export async function reloadActive() {

    // Remove all currently loaded games from memory.
    endAllDailyEmitters()
    loadedGames = {}

    // Determine the contents of the game path
    const activeGameFiles = await fs.readdir(Game.rootPath)

        .catch(async err => {

            // If the game path folder doesn't exist, make it
            await fs.mkdir(Game.rootPath, { recursive: true })

            // The folder is empty
            return [] as string[]
        })

    // Read in every active game
    // Use map to capture the promise associated with reading in the files
    const readPromises = activeGameFiles.map(async fileName => {

        // Skip non-JSON files
        if (!fileName.endsWith('.json')) return

        // Strip the file extension from the channel ID
        const channelId = fileName.slice(0, -5)

        // Load in the data
        const game = await Game.load(channelId)

        // Add the game to the cache
        loadedGames[channelId] = game
    })

    // Wait for all the file operations to complete
    await Promise.all(readPromises)
}

/**
 * Gets a game object managed by the guild and channel passed.
 * @param channel the channel that manages this game.
 */
export function get(channelId: string): Game {
    return loadedGames[channelId]
}

/**
 * A game that has ended and is being prepared for archival.
 */
interface EndedGame extends ActiveGame {
    /**
     * Date on which the game ended.
     */
    endDate: string
}

/**
 * Archives a game; removes it from memory and then moves the corresponding file
 * to the archive folder.
 * @param game the game to archive.
 */
export async function archive(game: ActiveGame) {

    // Stop the emitter
    game.endDailyEmitter()
    
    // Specify the end date
    const endedGame = game as EndedGame
    endedGame.endDate = new Date().toString()

    // Update the game and move it to the archive folder
    await endedGame.update()
    await fs.rename(endedGame.activePath(), archivePath(endedGame))
}

export class GameExistsError extends Error {
    constructor(public existingGame: Game) {
        super("Cannot create a new game on a channel with an existing game.")
    }
}

/**
 * Creates a new game to be managed by the passed TextChannel.
 * @param channel the channel that will manage this game.
 * @param GM the User to be this game's game master.
 */
export function newGame(channel: TextChannel, GM: User): Game {

    const game = new Game()
    game.channelId = channel.id
    game.gameMaster = GM.id

    if (loadedGames[channel.id] !== undefined) {
        throw new GameExistsError(loadedGames[channel.id])
    }

    loadedGames[channel.id] = game

    return game
}

/**
 * Starts the game of the specified ID, updating the cache to be the newly
 * created ActiveGame instance.
 * @param channelId the ID of the channel whose game will be started.
 */
export function startGame(
    channelId: string,
    options: GameStartOptions
): ActiveGame {
    const newGame = get(channelId).start(options)
    loadedGames[channelId] = newGame
    return newGame
}

/**
 * Ends all the daily emitters for this instance.
 */
export function endAllDailyEmitters() {
    for (const channelId in loadedGames) {
        const game = loadedGames[channelId]
        if (!(game instanceof ActiveGame)) continue
        game.endDailyEmitter()
    }
}
