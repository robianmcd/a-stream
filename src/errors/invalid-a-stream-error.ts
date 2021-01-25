import {AStreamError} from './a-stream-error';

export class InvalidAStreamError extends AStreamError {
    constructor(message) {
        super(message);
    }
}
