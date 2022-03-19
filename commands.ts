import { ApplicationCommandData, CommandInteraction } from 'discord.js'
import { Game, ActiveGame } from './games'

/**
 * Info and callback for registering and handling a slash command.
 */
export interface Command {
    /**
     * Object that defines this command in Discord's registry.
     */
    info: ApplicationCommandData
    /**
     * If provided, specifically indicates that this command is specific to a
     * game.
     */
    gameCommandInfo?: GameCommandInfo
    /**
     * Function to call upon receiving this interaction.
     */
    call: (interaction: CommandInteraction, game?: Game | ActiveGame) => void
}

/**
 * Additional information provided to commands that are game-specific.
 */
export interface GameCommandInfo {
    /**
     * If provided, restricts who can run this command.
     */
    for?: 'PLAYER' | 'JUROR' | 'GM' | 'SPECTATOR',
    /**
     * If provided, restricts in what phase of the game the command can be
     * run.
     */
    phase?: 'JOINING' | 'ACTIVE'
}

/**
 * A command that is not designed to be run within the context of a game.
 */
export interface GlobalCommand extends Command {
    gameCommandInfo?: undefined,
    call: (interaction: CommandInteraction) => void
}

/**
 * Commands that are designed specifically to be run within the context of a game.
 */
export interface GameCommand extends Command {
    gameCommandInfo: GameCommandInfo
    /**
     * Function to call upon receiving this interaction.
     */
    call: (interaction: CommandInteraction, game: Game | ActiveGame) => void
}

/**
 * Game commands exclusively allowed during the join phase of a game.
 */
export interface JoinPhaseGameCommand extends GameCommand {
    gameCommandInfo: GameCommandInfo & {
        phase: 'JOINING'
    },
    call: (interaction: CommandInteraction, game: Game) => void
}

/**
 * Game commands exclusively allowed during the active phase of a game.
 */
export interface ActivePhaseGameCommand extends GameCommand {
    gameCommandInfo: GameCommandInfo & {
        phase: 'ACTIVE'
    },
    call: (interaction: CommandInteraction, game: ActiveGame) => void
}

export const ping: Command = {
    info: {
        name: 'ping',
        description: 'Replies with "pong". For testing purposes.'
    },
    call: async interaction => {
        await interaction.reply({
            content: 'Pong',
            ephemeral: true
        })
    }
}

import { newGame } from './commands/new_game'
export const new_game = newGame
