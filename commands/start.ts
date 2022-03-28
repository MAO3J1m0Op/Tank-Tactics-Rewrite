import { Board } from '../board'
import { GameCommand } from '../commands'
import { startGame } from '../saved_games'

const start: GameCommand = {
    info: {
        name: 'start',
        description: "Starts the game of Tank Tactics."
    },
    gameCommandInfo: {
       for: 'GM',
       phase: 'JOINING'
    },
    call: async (inter, game) => {

        const startedGame = startGame(game.channelId, {

            // TODO: fancy-ish settings system
            spawnBoxSize: 5,
            startingActionCount: 0,
            startingHealth: 3
        })
        startedGame.update()

        // Draw the board
        const board = await Board.get(startedGame)
        await board.write()

        // Then send the board
        return inter.reply({
            content: "The game has begun! Here is the starting board.",
            files: [
                Board.path(startedGame)
            ]
        })
    }
}
export default start
