import {BaseStream, BaseStreamOptions} from './base-stream';

declare module './base-stream' {
    interface BaseStream<P extends any[], T, SourceP extends any[] = P> {
        debounce<T, SourceP extends any[]>(durationMs: number): DebounceStream<T, SourceP>;
    }
}

BaseStream.prototype.debounce = function <T, SourceP extends any[]>(durationMs: number = 200) {
    const nextStream = new DebounceStream<T, SourceP>(durationMs, this._sourceRunSegment);
    this._nextStreams.push(nextStream);
    return nextStream;
};

export interface DebounceStreamOptions<SourceP extends any[]> extends BaseStreamOptions<SourceP> {

}

export class DebounceStream<T, SourceP extends any[]> extends BaseStream<[T], T, SourceP> {
    _nextOutputEventPromise;
    _resolveOutputNextEvent;
    _rejectOutputNextEvent;
    _nextEventTimer;
    //could accept an option to configure this in the future and could support 'ignore' | 'reject' | 'resolve'
    _skippedEvents = 'ignore';

    constructor(
        private duration: number = 200,
        options: DebounceStreamOptions<SourceP> = {},
    ) {
        super(options);
    }

    async _handleFulfilledEvent(args: [T]) : Promise<T> {
        if(this._skippedEvents === 'ignore' || !this._nextOutputEventPromise) {
            this._nextOutputEventPromise = new Promise((resolve, reject) => {
                this._resolveOutputNextEvent = resolve;
                this._rejectOutputNextEvent = reject;
            });
        }

        if(this._nextEventTimer) {
            clearTimeout(this._nextEventTimer);
        }

        this._nextEventTimer = setTimeout(() => {
            this._resolveOutputNextEvent(args[0]);
            this._nextEventTimer = undefined;
            this._nextOutputEventPromise = undefined;
            this._resolveOutputNextEvent = undefined;
            this._rejectOutputNextEvent = undefined;
        }, this.duration);

        await this._nextOutputEventPromise;
        return args[0];
    }

}
