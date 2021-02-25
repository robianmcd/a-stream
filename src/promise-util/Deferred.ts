class Deferred<T> extends Promise<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;

    constructor() {
        const executor = (resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        };
        super(executor);
    }
}
