import {StateStream} from '../../src';

export const streamUtil = {
    getDelayableStream() {
        const sourceHandler = ({timeout, reject}: {timeout: number, reject?: boolean}) => {
            return new Promise<number>((resolve, rejectFunc) => {
                setTimeout(() => {
                    if (reject) {
                        rejectFunc(timeout);
                    } else {
                        resolve(timeout);
                    }
                }, timeout);
            });
        };

        return new StateStream<[{timeout: number, reject?: boolean}], number>(sourceHandler);
    },
}
