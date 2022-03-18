import { TextChannel, User } from 'discord.js'
import * as fs from 'fs/promises'

import { DailyEmitter } from './daily_emitter'
import { ActiveGame, Game } from './games'

let loadedGames: {
    [channelId: string]: Game
} = {}

/**
 * Gets the path to a file for a game.
 * @param game game for which the file path will be obtained.
 */
function activePath(game: Game): string {
    return `./data/active/${game.channelId}.json`
}

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

    // Determine the contents of ./data/active
    const activeGameFiles = await fs.readdir('./data/active')

        .catch(async err => {

            // If the /data/active folder doesn't exist, make it
            await fs.mkdir('./data/active', { recursive: true })

            // The folder is empty
            return [] as string[]
        })

    // Read in every active game
    // Use map to capture the promise associated with reading in the files
    const readPromises = activeGameFiles.map(async fileName => {

        // Strip the file extension from the channel ID
        const channelId = fileName.slice(0, -5)

        const data = await fs.readFile(
            `./data/active/${fileName}`, { encoding: 'utf8' }
        )
        const game: Game = JSON.parse(data)
        loadedGames[channelId] = game
    })

    // Wait for all the file operations to complete
    await Promise.all(readPromises)
}

/**
 * Gets a game object managed by the guild and channel passed.
 * @param channel the channel that manages this game.
 */
export function get(channel: TextChannel): Game {
    return loadedGames[channel.id]
}

/**
 * Updates the file corresponding to this game instance.
 * @param game the game instance to update.
 */
export async function update(game: Game) {
    fs.writeFile(
        activePath(game),
        JSON.stringify(game, null, 4)
    )
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
    endDailyEmitter(game)
    
    // Specify the end date
    const endedGame = game as EndedGame
    endedGame.endDate = new Date().toString()

    // Update the game and move it to the archive folder
    await update(endedGame)
    await fs.rename(activePath(endedGame), archivePath(endedGame))
}

/**
 * Creates a new game to be managed by the passed TextChannel.
 * @param channel the channel that will manage this game.
 * @param GM the User to be this game's game master.
 */
export function newGame(channel: TextChannel, GM: User): Game {

    const game: Game = {
        channelId: channel.id,
        gameMaster: GM.id,
        players: {},
        jury: []
    }

    loadedGames[channel.id] = game

    return game
}

let dailyEmitters: {
    [channelId: string]: DailyEmitter
} = {}

/**
 * Starts a daily emitter for a certain game.
 * @param game the game for which the emitter will be started.
 */
export function startDailyEmitter(game: ActiveGame) {
    dailyEmitters[game.channelId] = new DailyEmitter()
}

/**
 * Ends a daily emitter for a certain game.
 * @param game the game whose emitter will be ended.
 */
function endDailyEmitter(game: ActiveGame) {
    const emitter = dailyEmitters[game.channelId]
    if (emitter) emitter.close()
    dailyEmitters[game.channelId] = undefined
}

/**
 * Ends all the daily emitters for this instance.
 */
export function endAllDailyEmitters() {
    for (const channelId in dailyEmitters) {
        const emitter = dailyEmitters[channelId];
        emitter.close()
    }
    dailyEmitters = {}
}
