import {AStream} from '../src';
import * as chai from 'chai';

const {expect} = chai;
import * as sinon from 'sinon';
import {CanceledAStreamError} from '../src/errors/canceled-a-stream-error';


describe('ChildNode', () => {
    describe('.remove()', () => {
        it('node stops recieving events after being removed', async () => {
            const nextStreamExecutor = sinon.spy();

            const stream = new AStream(x => x);
            const nextStream = stream.next(nextStreamExecutor);

            await nextStream(1);

            expect(nextStreamExecutor.calledWith(1)).to.be.true;

            await nextStream.remove().catch(() => {});
            await stream(2);

            expect(nextStreamExecutor.calledWith(2)).to.be.false;
        });

        it('pending events are rejected when stream is removed', async () => {
            const stream1Executor = sinon.spy(x => x);
            const stream2Executor = sinon.spy();
            const stream3Executor = sinon.spy();

            const stream1 = new AStream(stream1Executor);
            const stream2 = stream1.next(stream2Executor);
            const stream3 = stream2.next(stream3Executor);

            const event1 = stream3(new Promise(() => {}));
            const event2 = stream3(new Promise(() => {}));

            await stream2.remove();

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

});
