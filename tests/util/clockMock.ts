import * as sinon from 'sinon';

export function setupMockClock() {
    let clock;
    let tick;
    beforeEach(function () {
        const nativeSetImmediate = setImmediate;
        clock = sinon.useFakeTimers();

        //Based on https://github.com/sinonjs/sinon/issues/738#issuecomment-428370425
        tick = async ms => {
            await new Promise(resolve => nativeSetImmediate(resolve));
            clock.tick(ms);
            await new Promise(resolve => nativeSetImmediate(resolve));
        }
    });

    afterEach(function () {
        clock.restore();
    });

    return (ms) => tick(ms);
}
