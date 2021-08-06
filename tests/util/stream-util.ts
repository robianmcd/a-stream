import {StateStream} from '../../src';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../../src/errors/canceled-a-stream-event';

export const streamUtil = {
    getDelayableStream() {
        const sourceHandler = ({value, timeout = 0, reject = false, cancel = false}: {value?: any,timeout?: number, reject?: boolean, cancel?: boolean}) => {
            if(value === undefined) {
                value = timeout;
            }
            return new Promise<number>((resolve, rejectFunc) => {
                setTimeout(() => {
                    if (reject) {
                        rejectFunc(value);
                    } else if (cancel) {
                        rejectFunc(new CanceledAStreamEvent(CanceledAStreamEventReason.Skipped, 'Canceled'));
                    } else {
                        resolve(value);
                    }
                }, timeout);
            });
        };

        return new StateStream<[{timeout: number, reject?: boolean}], number>(sourceHandler);
    }
}
