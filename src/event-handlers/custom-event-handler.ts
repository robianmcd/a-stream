import {BaseEventHandler} from './base-event-handler';

export interface Executor<T, TResult> {
    (value: T): Promise<TResult> | TResult
}

export class CustomEventHandler<T, TResult> extends BaseEventHandler<T, TResult> {
    protected _inputHandler: Executor<T, TResult>;

    constructor(
        inputHandler: Executor<T, TResult>,
    ) {
        super();

        this._inputHandler = inputHandler;
    }

    async handleFulfilledEvent(value: T, sequenceId: number): Promise<TResult> {
        return await this._inputHandler(value);
    }
}
