import {StateStream} from '../src';
import * as chai from 'chai';
import * as sinon from 'sinon';
import {CanceledAStreamEvent} from '../src/errors/canceled-a-stream-event';
import {RunOptions} from '../src/streams/run-options';

const {expect} = chai;


describe('ChildNode', () => {
    describe('.disconnect()', () => {
        it('node stops receiving events after being removed', async () => {
            const nextStreamExecutor = sinon.spy();

            const stream = new StateStream(x => x);
            const nextStream = stream.next(nextStreamExecutor);

            await nextStream(1);

            expect(nextStreamExecutor.calledWith(1)).to.be.true;

            await nextStream.disconnect();
            await stream(2);

            expect(nextStreamExecutor.calledWith(2)).to.be.false;
        });

        it('pending events are ignored when stream is removed if runOptions sets ignoreCanceledEvents flag', async () => {
            const stream1Executor = sinon.spy(x => x);
            const stream2Executor = sinon.spy();
            const stream3Executor = sinon.spy();
            const event1Catch = sinon.spy();
            const event2Catch = sinon.spy();

            const stream1 = new StateStream(stream1Executor);
            const stream2 = stream1.next(stream2Executor);
            const stream3 = stream2.next(stream3Executor);

            const event1 = stream3(new Promise(() => {}), new RunOptions({ignoreCanceledEvents: true}));
            event1.catch(event1Catch);
            const event2 = stream3(new Promise(() => {}));
            event2.catch(event2Catch);

            await stream2.disconnect();
            await event2.catch(() => {});

            expect(event1Catch.callCount).to.equal(0);
            expect(event2Catch.callCount).to.equal(1);

            await event2
                .then(
                    () => {
                        throw Error('event should have been rejected');
                    },
                    (reason) => {
                        expect(reason).to.be.an.instanceof(CanceledAStreamEvent);
                        expect(stream1Executor.callCount).to.equal(2);
                        expect(stream2Executor.callCount).to.equal(0);
                        expect(stream3Executor.callCount).to.equal(0);
                    }
                );
        });
    });
});
