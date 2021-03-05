import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {AStreamError} from '../errors/a-stream-error';

export interface AStreamErrorExecutor<TResult> {
    (aStreamError: AStreamError): Promise<TResult> | TResult
}

export class AStreamErrorEventHandler<T> extends BaseEventHandler<T, T> {
    protected readonly _aStreamErrorHandler: (value: AStreamError) => Promise<T> | T;

    constructor(
        _aStreamErrorHandler: AStreamErrorExecutor<T>,
    ) {
        super();

        this._aStreamErrorHandler = _aStreamErrorHandler;
    }

    async handleAStreamError(aStreamError: AStreamError, context: EventHandlerContext): Promise<T> {
        return await this._aStreamErrorHandler(aStreamError);
    }
}
