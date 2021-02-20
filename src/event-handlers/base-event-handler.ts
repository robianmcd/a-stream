export class BaseEventHandler<T, TResult> {
    setupEventHandlingTrigger(parentHandling: Promise<T>, sequenceId: number): Promise<T> {
        return parentHandling;
    }

    handleFulfilledEvent(value: T, sequenceId: number): Promise<TResult> {
        return Promise.resolve(<any>value);
    }

    handleRejectedEvent(reason, sequenceId: number): Promise<TResult> {
        return Promise.reject(reason);
    }
}
