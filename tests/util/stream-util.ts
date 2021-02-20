import {AStream} from '../../src';

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

        return new AStream<[{timeout: number, reject?: boolean}], number>(sourceHandler);
    },
}
