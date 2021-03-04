import {AStreamError} from './a-stream-error';

export class SkippedAStreamError extends AStreamError {
    constructor(message) {
        super(message);
    }
}
