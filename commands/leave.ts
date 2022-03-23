import { GameCommand } from '../commands'
import { update } from '../saved_games'

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
        await update(game)

        return inter.reply({
            content: "Sorry to see you go!",
            ephemeral: false
        })
    }
}
export default leave
