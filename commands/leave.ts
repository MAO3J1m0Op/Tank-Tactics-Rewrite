import { GameCommand } from '../commands'

const leave: GameCommand = {
    info: {
        name: 'leave',
        description: "Quit a game of Tank Tactics."
    },
    gameCommandInfo: {
        for: 'PLAYER'
    },
    call: async (inter, game) => {

        delete game.players[inter.user.id]
        await game.update()

        return inter.reply({
            content: "Sorry to see you go!",
            ephemeral: false
        })
    }
}
export default leave
