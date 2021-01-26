import {BaseStreamNode, BaseStreamOptions} from './base-stream-node';

declare module './base-stream-node' {
    interface BaseStreamNode<T, TResult, SourceParams extends any[]> {
        debounce<T, SourceParams extends any[]>(durationMs: number): DebounceStreamNode<T, SourceParams>;
    }
}

BaseStreamNode.prototype.debounce = function <T, SourceParams extends any[]>(durationMs: number = 200) {
    const nextStream = new DebounceStreamNode<T, SourceParams>(durationMs, {parentStream: this});
    this._nextStreams.push(nextStream);
    return nextStream;
};

export interface DebounceStreamOptions<T, SourceParams extends any[]> extends BaseStreamOptions<T, SourceParams> {

}

export class DebounceStreamNode<T, SourceParams extends any[]> extends BaseStreamNode<T, T, SourceParams> {
    _nextOutputEventPromise;
    _resolveOutputNextEvent;
    _rejectOutputNextEvent;
    _nextEventTimer;
    //could accept an option to configure this in the future and could support 'ignore' | 'reject' | 'resolve'
    _skippedEvents = 'ignore';

    constructor(
        private duration: number = 200,
        options: DebounceStreamOptions<T, SourceParams> = {},
    ) {
        super(options);
    }

    async _handleFulfilledEvent(value: T): Promise<T> {
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
