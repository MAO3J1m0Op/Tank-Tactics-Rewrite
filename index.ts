import * as discord from 'discord.js'
import * as dotenv from 'dotenv'
import * as commands from './commands'

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

    // Call the associated command
    commands[interaction.commandName]?.call(interaction)
})

bot.login(process.env.TOKEN)
