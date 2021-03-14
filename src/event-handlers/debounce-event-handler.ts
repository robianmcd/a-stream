import {BaseEventHandler, EventHandlerContext} from './base-event-handler';

export class DebounceEventHandler<T> extends BaseEventHandler<T, T> {
    _nextOutputEventPromise;
    _resolveOutputNextEvent;
    _rejectOutputNextEvent;
    _nextEventTimer;
    //could accept an option to configure this in the future and could support 'ignore' | 'reject' | 'resolve'
    _skippedEvents = 'ignore';

    constructor(
        private duration: number = 200
    ) {
        super();
    }

    async handleFulfilledEvent(value: T, context: EventHandlerContext<T>): Promise<T> {
        //TODO: rewrite this so that skipped events are rejected
        if (this._skippedEvents === 'ignore' || !this._nextOutputEventPromise) {
            this._nextOutputEventPromise = new Promise((resolve, reject) => {
                this._resolveOutputNextEvent = resolve;
                this._rejectOutputNextEvent = reject;
            });
        }

        if (this._nextEventTimer) {
            clearTimeout(this._nextEventTimer);
        }

        this._nextEventTimer = setTimeout(() => {
            this._resolveOutputNextEvent(value);
            this._nextEventTimer = undefined;
            this._nextOutputEventPromise = undefined;
            this._resolveOutputNextEvent = undefined;
            this._rejectOutputNextEvent = undefined;
        }, this.duration);

        await this._nextOutputEventPromise;
        return value;
    }

}
