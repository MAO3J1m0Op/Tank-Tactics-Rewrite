import { GameCommand } from '../commands'

const list: GameCommand = {
    info: {
        name: 'list',
        description: 'List various things about the game of Tank Tactics on this channel.',
        options: [
            {
                type: 'SUB_COMMAND',
                name: 'players',
                description: 'List all players in the game.'
            },
            {
                type: 'SUB_COMMAND',
                name: 'jury',
                description: 'List all players who are now part of the jury.'
            },
            {
                type: 'SUB_COMMAND',
                name: 'gm',
                description: 'List the user who is the GM.'
            },
        ]
    },
    gameCommandInfo: {},
    call: async (inter, game) => {
        const subCommand = inter.options.getSubcommand(true)

        if (subCommand === 'gm') {

            const GM = await inter.guild.members.fetch({
                user: game.gameMaster
            })

            return inter.reply({
                content: `The GM of this game is ${GM}.`,
                ephemeral: true
            })
        }

        else if (subCommand === 'players') {
            
            const players = await inter.guild.members.fetch({
                user: Object.keys(game.players)
            })

            if (players.size === 0) {
                return inter.reply({
                    content: 'This game has no players. Be the first to join!',
                    ephemeral: true
                })
            }

            const header = 'All players currently in this game:\n'
            const body = players.map(player => `- ${player}`).join('\n')

            return inter.reply({
                content: header + body,
                ephemeral: true
            })
        }
    }
}
export default list
