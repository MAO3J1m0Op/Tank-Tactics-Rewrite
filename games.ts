import { User } from 'discord.js'
import { DailyEmitter } from './daily_emitter'
import { TankPattern } from './board'
import Vector, * as vector from './vector'
import * as fs from 'fs/promises'

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
 * The data that is stored in the JSON file.
 */
interface GameData {
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

interface ActiveGameData extends GameData {
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
 * Class that manages a game of Tank Tactics.
 */
export class Game implements GameData {

    channelId: string = null
    gameMaster: string = null
    players: { [userId: string]: PlayerData } = {}
    jury: string[] = []

    /**
     * Loads in a game from file and returns the game.
     * @param channelId the ID of the channel hosting the loaded game.
     */
    static async load(channelId: string): Promise<Game> {
        const fileContents = await fs.readFile(
            Game.path(channelId), { encoding: 'utf-8' })
        const gameData = JSON.parse(fileContents) as GameData

        // Decide whether to instantiate a Game or ActiveGame
        let game: Game
        if ((gameData as ActiveGameData).startDate !== undefined) {
            game = new ActiveGame()
        } else {
            game = new Game()
        }

        // Then copy in the attributes
        for (const key in gameData) game[key] = gameData[key]

        return game
    }

    static rootPath: string = './data/active'

    /**
     * Gets the path to a file for a game.
     * @param channelId the ID of the channel hosting the game.
     */
    static path(channelId: string): string {
        return `${Game.rootPath}/${channelId}.json`
    }

    /**
     * Gets the path to the game's file.
     */
    activePath(): string {
        return Game.path(this.channelId)
    }

    /**
     * Gets the part of this game that is serialized into JSON.
     */
    data(): GameData {
        return {
            channelId: this.channelId,
            gameMaster: this.gameMaster,
            jury: this.jury,
            players: this.players
        }
    }

    /**
     * Updates this game's file.
     */
    async update() {
        return fs.writeFile(
            this.activePath(),
            JSON.stringify(this.data(), null, 4)
        )
    }

    /**
     * Checks if a given user is a player in the game.
     * @param user the user to check.
     */
    userIsPlayer(user: User): boolean {
        return Object.keys(this.players).includes(user.id)
    }

    /**
     * Checks if a given user is the GM of the game.
     * @param user the user to check.
     */
    userIsGM(user: User): boolean {
        return this.gameMaster === user.id
    }

    /**
     * Checks if a given user is a juror in the game.
     * @param user the user to check.
     */
    userIsJuror(user: User): boolean {
        return this.jury.includes(user.id)
    }

    /**
     * Checks if a pattern is unique in this game.
     * @param pattern the pattern to check.
     */
    patternIsUnique(pattern: TankPattern): boolean {

        const copyingPlayer = Object.values(this.players)
            .find(player => 
                pattern.kind === player.pattern.kind
                && pattern.primary === player.pattern.primary
                && pattern.secondary === player.pattern.secondary)

        return copyingPlayer === undefined
    }
    
    /**
     * Creates a new ActiveGame instance that encapsulates this game as a
     * started game. Once this function is called, this instance should be
     * discarded in favor of the return value.
     * @param options options used to start the game.
     */
    start(options: GameStartOptions): ActiveGame {
    
        const startedGame = new ActiveGame()
    
        // Copy in the data from the game
        const oldData = {...this.data()}
        for (const key in oldData) startedGame[key] = oldData[key]
    
        // Determine the ideal size of the board
        const spawnBoxGridSize = vector.boxiestBox(
            Object.keys(startedGame.players).length
        )
    
        // Scale the spawnBoxGrid to get the board size
        startedGame.boardSize = vector.scaleVector(
            spawnBoxGridSize, options.spawnBoxSize
        )
    
        // Assign other properties within the started game
        startedGame.startDate = new Date().toISOString()
    
        let playersAndBoxes: Array<{
            playerId: string,
            playerObj: ActivePlayerData,
            spawnBox: Vector
        }>
    
        // Assign a spawn box to each player
        playersAndBoxes = Object.keys(startedGame.players)
            .map((playerId, i) => {
                return {
                    playerId: playerId,
                    playerObj: startedGame
                        .players[playerId] as ActivePlayerData,
                    spawnBox: {
                        x: Math.floor(i / spawnBoxGridSize.x),
                        y: i % spawnBoxGridSize.x
                    }
                }
            })
        
        // Populate each player object
        playersAndBoxes.forEach(player => {
            player.playerObj.actions = options.startingActionCount
            player.playerObj.health = options.startingHealth || 3
    
            const posInSpawnBox: Vector = {
                x: Math.random() * options.spawnBoxSize,
                y: Math.random() * options.spawnBoxSize
            }
            // Position of the spawn box start on the board
            const spawnBoxStartPos = vector.scaleVector(
                player.spawnBox, 
                options.spawnBoxSize
            )
    
            // And finally define the player's start position
            player.playerObj.position = vector.addVectors(
                spawnBoxStartPos, 
                posInSpawnBox
            )
        })
    
        return startedGame
    }
}

/**
 * An instance of a game that is in play.
 */
export class ActiveGame extends Game implements ActiveGameData {

    players: { [userId: string]: ActivePlayerData } = {}
    startDate: string = null
    boardSize: Vector = null
    private dailyEmitter: DailyEmitter = new DailyEmitter()

    data(): ActiveGameData {
        const oldData = super.data() as ActiveGameData
        oldData.boardSize = this.boardSize
        oldData.startDate = this.startDate
        return oldData
    }

    /**
     * Ends this game's daily emitter
     */
    endDailyEmitter() {
        if (this.dailyEmitter) this.dailyEmitter.close()
    }

    /**
     * Gets the player who is at a specified position.
     * @param position the position to check.
     * @returns the ID of the player at the specified position, or undefined if
     * the space is empty.
     */
    tankAt(position: Vector): string | undefined {

        // Find the player with a tank at the position
        const playerEntry = Object.entries(this.players)
            .find(entry => vector.compare(entry[1].position, position))

        return playerEntry !== undefined ? playerEntry[0] : undefined
    }
}

export interface GameStartOptions {
    /**
     * Length and height of the box in which each player spawns.
     */
    spawnBoxSize: number
    /**
     * Number of action points with which each player starts. Defaults to 0.
     */
    startingActionCount: number
    /**
     * Starting health for each player. Defaults to 3.
     */
    startingHealth?: number
}
