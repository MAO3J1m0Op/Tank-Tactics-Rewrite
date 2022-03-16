import { ApplicationCommandData, CommandInteraction } from 'discord.js'

export interface Command {
    /**
     * Object that defines this command in Discord's registry.
     */
    info: ApplicationCommandData
    /**
     * Function to call upon receiving this interaction.
     */
    call: (interaction: CommandInteraction) => any
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
