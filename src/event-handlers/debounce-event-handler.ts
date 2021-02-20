import {BaseNode} from '../streams/base-node';
import {BaseEventHandler} from './base-event-handler';

declare module '../streams/base-node' {
    interface BaseNode<T, TResult, SourceParams extends any[]> {
        debounce(durationMs: number): BaseNode<TResult, TResult, SourceParams>;
    }
}

BaseNode.prototype.debounce = function <T, TResult, SourceParams extends any[]>(
    this: BaseNode<T, TResult, SourceParams>,
    durationMs: number = 200,
): BaseNode<TResult, TResult, SourceParams> {
    const debounceEventHandler = new DebounceEventHandler<TResult>(durationMs);
    return this.addChild(debounceEventHandler);
};

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

    async handleFulfilledEvent(value: T, sequenceId: number): Promise<T> {
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
