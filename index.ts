import * as discord from 'discord.js'
import * as dotenv from 'dotenv'
import * as commands from './commands'
import { ActiveGame } from './games'
import * as savedGames from './saved_games'

dotenv.config()

const bot = new discord.Client({
    intents: [
        discord.Intents.FLAGS.GUILDS,
    ]
})

bot.on('ready', () => {
    // Broadcast ready message
    console.log(`Client ready as ${bot.user.tag}.`)

    // Determine whether to use test guild or to register global commands
    let commandRegistry: discord.ApplicationCommandManager<any, any, any>
    if (process.env.TEST_GUILD === undefined) {
        // Register commands globally
        commandRegistry = bot.application?.commands

    } else {
        // Register commands in a test guild

        // Fetch said test guild
        const guild = bot.guilds.cache.get(process.env.TEST_GUILD)

        if (guild === undefined) {
            throw new Error(
                'The client is not registered with the specified test guild.'
            )
        }

        commandRegistry = guild.commands
    }

    // Register all the commands
    for (const name in commands) {
        const command = commands[name]
        commandRegistry.create(command.info)
    }
})

bot.on('interactionCreate', interaction => {

    if (!interaction.isCommand()) return

    // Get the command object
    const command: commands.Command = commands[interaction.commandName]

    if (!command) return
    if (command.gameCommandInfo) {
        // Game commands

        const gameCommand = command as commands.GameCommand

        // Find the game in which the channel was called
        const game = savedGames.get(interaction.channel.id)

        // Reply with an error if there is no game for the invoking channel
        if (!game) {
            return interaction.reply({
                content: "That command must be invoked "
                    + "in a Tank Tactics channel.",
                ephemeral: true
            })
        }

        // Filter based on the channel's focus
        if (gameCommand.gameCommandInfo.for === 'GM'
            && !game.userIsGM(interaction.user))
        {
            return interaction.reply({
                content: "That command is restricted to the game's GM.",
                ephemeral: true
            })
        }
        if (game instanceof ActiveGame
            && gameCommand.gameCommandInfo.for === 'JUROR'
            && !game.userIsJuror(interaction.user))
        {
            return interaction.reply({
                content: "That command is restricted to the game's jury.",
                ephemeral: true
            })
        }
        if (game.userIsPlayer(interaction.user)) {
            if (gameCommand.gameCommandInfo.for === 'SPECTATOR') {
                return interaction.reply({
                    content: "That command is only for game spectators.",
                    ephemeral: true
                })
            }
        } else {
            if (gameCommand.gameCommandInfo.for === 'PLAYER') {
                return interaction.reply({
                    content: "That command is only for players in this game.",
                    ephemeral: true
                })
            }
        }

        // Filter based on the game's phase
        if (game instanceof ActiveGame) {
            if (gameCommand.gameCommandInfo.phase === 'JOINING') {
                return interaction.reply({
                    content: "That command isn't useable now, "
                        + "as the game has already started.",
                    ephemeral: true
                })
            }
        } else {
            if (gameCommand.gameCommandInfo.phase === 'ACTIVE') {
                return interaction.reply({
                    content: "That command isn't useable now, "
                        + "as the game has not yet started.",
                    ephemeral: true
                })
            }
        }

        gameCommand.call(interaction, game)

    } else {
        // Global commands

        const globalCommand = command as commands.GlobalCommand

        // No additional parsing needs to be done for global commands
        globalCommand.call(interaction)
    }
})

savedGames.reloadActive()
bot.login(process.env.TOKEN)

function onExit() {
    console.log('Shutting down.')
    bot.destroy()
    savedGames.endAllDailyEmitters()
}

process.on('SIGINT', onExit)
