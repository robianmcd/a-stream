import {AStream} from '../src';
import * as chai from 'chai';

const {expect} = chai;
import * as sinon from 'sinon';
import {CanceledAStreamError} from '../src/errors/canceled-a-stream-error';


describe('ChildNode', () => {
    describe('.disconnectNode()', () => {
        it('node stops receiving events after being removed', async () => {
            const nextStreamExecutor = sinon.spy();

            const stream = new AStream(x => x);
            const nextStream = stream.next(nextStreamExecutor);

            await nextStream(1);

            expect(nextStreamExecutor.calledWith(1)).to.be.true;

            await nextStream.disconnectNode();
            await stream(2);

            expect(nextStreamExecutor.calledWith(2)).to.be.false;
        });

        it('pending events are rejected when stream is removed', async () => {
            const stream1Executor = sinon.spy(x => x);
            const stream2Executor = sinon.spy();
            const stream3Executor = sinon.spy();
            const event2Catch = sinon.spy();

            const stream1 = new AStream(stream1Executor);
            const stream2 = stream1.next(stream2Executor);
            const stream3 = stream2.next(stream3Executor);

            const event1 = stream3(new Promise(() => {}));
            const event2 = stream3(new Promise(() => {}));
            event2.catch(event2Catch);

            await stream2.disconnectNode();

            //Test that promises have already been rejected after awaiting the call to disconnectNode
            expect(event2Catch.calledWith(sinon.match.instanceOf(CanceledAStreamError))).to.be.true;

            await event1
                .then(
                    () => {
                        throw Error('event should have been rejected');
                    },
                    (reason) => {
                        expect(reason).to.be.an.instanceof(CanceledAStreamError);
                        expect(stream1Executor.callCount).to.equal(2);
                        expect(stream2Executor.callCount).to.equal(0);
                        expect(stream3Executor.callCount).to.equal(0);
                    }
                );

            await event2
                .then(
                    () => {
                        throw Error('event should have been rejected');
                    },
                    (reason) => {
                        expect(reason).to.be.an.instanceof(CanceledAStreamError);
                        expect(stream1Executor.callCount).to.equal(2);
                        expect(stream2Executor.callCount).to.equal(0);
                        expect(stream3Executor.callCount).to.equal(0);
                    }
                );
        });
    });

    describe('.endStream()', () => {
        it('disconnects all nodes in a stream', async () => {
            const nextStreamExecutor = sinon.spy();

            const stream1 = new AStream(x => x);
            const stream2 = stream1.next(nextStreamExecutor);

            await stream2.endStream();

            expect(stream1.isDisconnected).to.be.true;
            expect(stream2.isDisconnected).to.be.true;
        });
    });

});
