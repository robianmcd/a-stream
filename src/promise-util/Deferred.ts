export class Deferred<T> extends Promise<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;

    constructor() {
        let promiseResolve;
        let promiseReject;
        super((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });

        this.resolve = promiseResolve;
        this.reject = promiseReject;
    }

    // Taken from https://stackoverflow.com/a/60328122/373655
    // return a Promise for then/errorHandler/finally
    static get [Symbol.species]() {
        return Promise;
    }

    get [Symbol.toStringTag]() {
        return 'Deferred';
    }
}
