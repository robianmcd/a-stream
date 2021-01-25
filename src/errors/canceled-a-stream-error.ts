import {AStreamError} from './a-stream-error';

export class CanceledAStreamError extends AStreamError {
    constructor(message) {
        super(message);
    }
}
