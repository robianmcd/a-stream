import {BaseEventHandler} from '../event-handlers/base-event-handler';

export interface ReadableNode<T, TResult> {
    acceptingEvents: Promise<any>;
    isDisconnected: boolean;
    readonly isPending: boolean;

    status: 'success' | 'error' | 'uninitialized';
    value: TResult;
    error: any;

    hasValue(): boolean;
    hasError(): boolean;
    isInitialized(): boolean;

    addChild<TChildResult>(childEventHandler: BaseEventHandler<TResult, TChildResult>): ReadableNode<TResult, TChildResult>;
}
