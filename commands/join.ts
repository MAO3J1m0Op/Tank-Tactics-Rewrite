import * as board from '../board'
import { JoinPhaseGameCommand } from '../commands'
import { patternIsUnique } from '../games'
import { update } from '../saved_games'

// All color choices
const colorChoices = Object.keys(board.colorCodes).map(color => {
    return {
        name: color,
        value: color
    }
})

// All pattern choices
const patternChoices = Object.entries(board.patternNames).map(pattern => {
    const technicalName = pattern[0]
    const genericName = pattern[1]
    return {
        name: genericName,
        value: technicalName
    }
})

export const join: JoinPhaseGameCommand = {
    info: {
        name: 'join',
        description: "Invoke in a Tank Tactics channel to join the game.",
        options: [
            {
                name: 'primary_color',
                description: "Primary color of your tank.",
                type: 'STRING',
                required: false,
                choices: colorChoices
            },
            {
                name: 'secondary_color',
                description: "Secondary color of your tank.",
                type: 'STRING',
                required: false,
                choices: colorChoices
            },
            {
                name: 'pattern',
                description: "Pattern your tank will adopt.",
                type: 'STRING',
                required: false,
                choices: patternChoices
            }
        ]
    },
    gameCommandInfo: {
        phase: 'JOINING',
        for: 'SPECTATOR'
    },
    call: async (inter, game) => {

        let pattern: board.TankPattern = {
            primary: inter.options.getString('primary_color') as board.Color,
            secondary: inter.options.getString('secondary_color') as board.Color,
            kind: inter.options.getString('pattern') as board.PatternKind
        }

        // primary is null: random pattern
        if (pattern.primary === null) {
            
            // Ensure all other options are not provided
            if (pattern.secondary !== null || pattern.kind !== null) {
                return inter.reply({
                    content: "You must also specify a primary color.",
                    ephemeral: true
                })
            }

            // Generate a random pattern
            // Don't use an infinite loop because a lack of unique patterns
            // would freeze the bot.
            let i = 0
            for (; i < 1000; ++i) {
                pattern = {
                    primary: board.randomColor(),
                    secondary: board.randomColor(),
                    kind: board.randomPattern()
                }

                if (pattern.primary !== pattern.secondary
                    && patternIsUnique(game, pattern)) break
            }

            // Check if we jumped out of the loop or exhausted it
            if (i == 1000) {
                return inter.reply({
                    content: "Couldn't find a random unique pattern for you.",
                    ephemeral: true
                })
            }

        } 
        // Primary is not null, use the provided pattern
        else {
            
            // Solid pattern
            if (pattern.kind === null) {
                // Ensure the secondary color is null
                pattern.secondary = null
            } else {
                // Ensure a secondary color was provided
                if (pattern.secondary === null) {
                    return inter.reply({
                        content: "You must also specify a secondary color.",
                        ephemeral: true
                    })
                }
            }

            // Ensure the provided pattern is unique
            if (!patternIsUnique(game, pattern)) {
                return inter.reply({
                    content: "The pattern you chose is already taken.",
                    ephemeral: true
                })
            }

            // And also has two different colors
            if (pattern.primary === pattern.secondary) {
                return inter.reply({
                    content: "Your two colors must be different.",
                    ephemeral: true
                })
            }
        }

        // Adds the player to the game
        game.players[inter.user.id] = {
            pattern: pattern
        }
        await update(game)

        return inter.reply({
            content: `Welcome to the game, ${inter.user}!`,
            ephemeral: false
        })
    }
}