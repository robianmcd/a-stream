import * as chai from 'chai';

const {expect} = chai;

declare global {
    interface WeakRef<T extends object> {
        readonly [Symbol.toStringTag]: "WeakRef";

        /**
         * Returns the WeakRef instance's target object, or undefined if the target object has been
         * reclaimed.
         */
        deref(): T | undefined;
    }

    interface WeakRefConstructor {
        readonly prototype: WeakRef<any>;

        /**
         * Creates a WeakRef instance for the given target object.
         * @param target The target object for the WeakRef instance.
         */
        new<T extends object>(target?: T): WeakRef<T>;
    }

    var WeakRef: WeakRefConstructor;
}

async function runGarbageCollection() {
    if (global.gc) {
        await new Promise((resolve) => {setTimeout(resolve)});
        global.gc();
    } else {
        console.warn("`Need to set --expose-gc node flag to run garbage collection tests`");
    }
}

//Needs to be defined outside of createPromise or it's closure will stop the promise from being garbage collected
const thenHandler = () => {console.log("shouldn't run")};

function createPromise() {
    const ref = <any>{};
    ref.promise = new Promise((reject, resolve) => {
        ref.reject = reject;
        ref.resolve = resolve;
        ref.weakReject = new WeakRef(reject);
        ref.weakResolve = new WeakRef(resolve);
    });
    ref.weakPromise = new WeakRef(ref.promise);

    ref.thenHandler = thenHandler;
    ref.promise.then(ref.thenHandler);
    ref.weakThenHandler = new WeakRef(ref.thenHandler);
    return ref;
}

//Skip tests if node version doesn't have WeakRef
//Taken from https://stackoverflow.com/a/42586302/373655
(global.WeakRef ? describe : describe.skip)('Memory Leaks', () => {
    it('Unresolved promise should be cleaned up if there is no reference to resolve and reject', async () => {
        let {thenHandler, weakReject, weakResolve, weakPromise, weakThenHandler} = createPromise();
        await runGarbageCollection();
        expect(weakPromise.deref()).to.be.undefined;
        expect(weakReject.deref()).to.be.undefined;
        expect(weakResolve.deref()).to.be.undefined;
        expect(weakPromise.deref()).to.be.undefined;
        expect(weakThenHandler.deref()).not.to.be.undefined;
    });

    it('Unresolved promise should not be cleaned up if there is a reference to resolve', async () => {
        let {resolve, weakResolve, weakPromise, weakThenHandler} = createPromise();
        await runGarbageCollection();
        expect(weakPromise.deref()).not.to.be.undefined;
        expect(weakResolve.deref()).not.to.be.undefined;
        expect(weakPromise.deref()).not.to.be.undefined;
        expect(weakThenHandler.deref()).not.to.be.undefined;
    });
});
