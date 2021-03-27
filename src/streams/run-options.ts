export class RunOptions {
    ignoreCanceledEvents: boolean;
    constructor({ignoreCanceledEvents = false} = {}) {
        this.ignoreCanceledEvents = ignoreCanceledEvents;
    }
}
