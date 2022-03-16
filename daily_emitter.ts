import { EventEmitter } from 'events'

/**
 * Calls the registered functions once a day at midnight.
 */
export class DailyEmitter {

    /**
     * The ID of the timeout that starts the interval.
     */
    private timeoutId: ReturnType<typeof setTimeout> | null
    /**
     * The ID of the interval that continuously calls the callback.
     */
    private intervalId: ReturnType<typeof setInterval> | null = null
    /**
     * The emitter that manages the registered functions.
     */
    private emitter = new EventEmitter()

    /**
     * Schedules the callbacks to be called daily at a set time.
     * @param hour the hour of the day to call the callback.
     * @param minute the minute of the hour.
     * @param second the second of the minute.
     * @param millis the millisecond within the second.
     */
    constructor(
        hour: number = 0,
        minute: number = 0,
        second: number = 0,
        millis: number = 0
    ) {
        // The target time
        const target = new Date(Date.now())
        target.setHours(hour)
        target.setMinutes(minute)
        target.setSeconds(second)
        target.setMilliseconds(millis)

        // Get the number of milliseconds between now and the target time
        const timeToTarget = target.getTime() - Date.now()

        // Calls the daily callback the first time
        this.timeoutId = setTimeout(
            () => this.transitionToInterval(),
            timeToTarget
        )
    }

    /**
     * Invoked through a timeout that calls the daily callback for the first
     * time. This method is responsible for transitioning this instance into
     * setting up an interval.
     */
    private transitionToInterval() {

        // Call the daily callback
        this.invokeNow()

        // Start the interval
        this.timeoutId = null
        this.intervalId = setInterval(
            () => this.invokeNow(), 
            24 * 3600 * 1000
        )
    }

    /**
     * Registers a callback to be called daily.
     * @param callback the callback to be called daily at the specified time.
     * @returns the instance of the DailyEmitter.
     */
    on(callback: () => void): this {
        this.emitter.on('daily', callback)
        return this
    }

    /**
     * Invokes all registered callbacks immediately.
     */
    invokeNow() {
        this.emitter.emit('daily')
    }

    /**
     * Stops all timers that prevent NodeJS from exiting.
     */
    close() {
        if (this.timeoutId !== null) clearTimeout(this.timeoutId)
        if (this.intervalId !== null) clearInterval(this.intervalId)
    }
}