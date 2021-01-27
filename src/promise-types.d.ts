export interface PromiseResolution<T> {
    status: 'fulfilled';
    value: T;
}

export interface PromiseRejection<E> {
    status: 'rejected';
    reason: E;
}

export type PromiseResult<T, E = unknown> = PromiseResolution<T> | PromiseRejection<E>;
