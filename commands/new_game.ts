import { 
    CommandInteraction, 
    Constants, 
    DiscordAPIError, 
    TextChannel 
} from 'discord.js'
import { GlobalCommand } from '../commands'
import { Game } from '../games'
import * as savedGames from '../saved_games'

const newGame: GlobalCommand = {
    info: {
        name: 'new_game',
        description: 'Create a new game of Tank Tactics.',
        options: [
            {
                type: 'SUB_COMMAND',
                name: 'here',
                description: "Create a new game of Tank Tactics on this channel."
            },
            {
                type: 'SUB_COMMAND',
                name: 'on',
                description: "Create a new game of Tank Tactics on a new channel.",
                options: [
                    {
                        type: 'STRING',
                        name: 'channel_name',
                        description: "Name of the new channel to create.",
                        required: true
                    }
                ]
            }
        ]
    },
    call: inter => {
        switch (inter.options.getSubcommand(true)) {
            case 'on':
                return newGameChannel(inter)
            case 'here':
                return newGameHere(inter)
        }
    }
}

async function newGameHere(inter: CommandInteraction) {

    let game: Game

    try {
        game = savedGames.newGame(inter.channel as TextChannel, inter.user)
    } catch (err) {
        if (err instanceof savedGames.GameExistsError) {
            return inter.reply({
                content: "There's already a game on this channel.",
                ephemeral: true
            })
        }
        else throw err
    }

    inter.reply({
        content: "Created a new Tank Tactics game on this channel!",
        ephemeral: false
    })
}

async function newGameChannel(inter: CommandInteraction) {

    const channelName = inter.options.getString('channel_name', true)

    let newChannel: TextChannel

    // Create the new channel
    try {
        newChannel = await inter.guild.channels.create(channelName, {
            type: 'GUILD_TEXT',
            reason: "Created new game of Tank Tactics",
            permissionOverwrites: [
                // Overwrites for @everyone
                {
                    id: inter.guild.id,
                    deny: [
                        'SEND_MESSAGES',
                        'SEND_TTS_MESSAGES'
                    ],
                    allow: [
                        'USE_APPLICATION_COMMANDS',
                        'READ_MESSAGE_HISTORY'
                    ]
                }
            ]
        })
    } catch (err) {
        if (err instanceof DiscordAPIError) {
            if (err.code === Constants.APIErrors.MISSING_PERMISSIONS) {
                return inter.reply({
                    content: "I don't have the permissions "
                        + "to create a new channel.",
                    ephemeral: true
                })
            }
        }
    }

    // Make a new game
    const game = savedGames.newGame(newChannel, inter.user)
    await game.update()

    inter.reply({
        content: `Created a new Tank Tactics game on ${newChannel}!`,
        ephemeral: false
    })
}
export default newGame
