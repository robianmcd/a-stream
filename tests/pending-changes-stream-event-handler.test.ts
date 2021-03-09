import * as chai from 'chai';
import {streamUtil} from './util/stream-util';
import {setupMockClock} from './util/clock-mock';
import * as sinon from 'sinon';

const {expect} = chai;

//TODO: test disconnecting cases and handling of errors and AStreamErrors
describe('PendingChangesEventHandler', () => {
    let tick = setupMockClock();

    describe('.pendingChangesStream()', () => {
        it('base case', async () => {
            const pendingChangesExecutor = sinon.spy(msg => msg);
            const stream = streamUtil.getDelayableStream();
            const pendingStream = stream.pendingChangesStream()
            pendingStream
                .next(pendingChangesExecutor);

            await tick(0);

            expect(pendingChangesExecutor.callCount).to.equal(0);

            stream({timeout: 200});
            await tick(0);

            expect(pendingChangesExecutor.callCount).to.equal(1);
            expect(pendingStream.value).to.be.true;
            expect(pendingChangesExecutor.lastCall.calledWith(true)).to.be.true;


            await tick(200);

            expect(pendingChangesExecutor.callCount).to.equal(2);
            expect(pendingStream.value).to.be.false;
            expect(pendingChangesExecutor.lastCall.calledWith(false)).to.be.true;
        });

        it('responds to alternating state', async () => {
            const pendingChangesExecutor = sinon.spy(msg => msg);
            const stream = streamUtil.getDelayableStream();
            const pendingStream = stream.pendingChangesStream()
            pendingStream
                .next(pendingChangesExecutor);

            stream({timeout: 200});
            await tick(300);
            stream({timeout: 200});
            await tick(100);

            expect(pendingChangesExecutor.callCount).to.equal(3);
            expect(pendingStream.value).to.be.true;
            expect(pendingChangesExecutor.lastCall.calledWith(true)).to.be.true;


            await tick(100);

            expect(pendingChangesExecutor.callCount).to.equal(4);
            expect(pendingStream.value).to.be.false;
            expect(pendingChangesExecutor.lastCall.calledWith(false)).to.be.true;
        });

        it('handels overlapping events', async () => {
            const pendingChangesExecutor = sinon.spy(msg => msg);
            const stream = streamUtil.getDelayableStream();
            const pendingStream = stream.pendingChangesStream()
            pendingStream
                .next(pendingChangesExecutor);

            stream({timeout: 200}); // event 1
            await tick(100);
            stream({timeout: 200}); // event 2
            await tick(100);

            expect(pendingChangesExecutor.callCount).to.equal(1);
            expect(pendingStream.value).to.be.true;
            expect(pendingChangesExecutor.lastCall.calledWith(true)).to.be.true;

            stream({timeout: 25});
            await tick(100); // event 3

            expect(pendingChangesExecutor.callCount).to.equal(2);
            expect(pendingStream.value).to.be.false;
            expect(pendingChangesExecutor.lastCall.calledWith(false)).to.be.true;
        });

    });

});
