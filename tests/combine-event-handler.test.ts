import {AStream} from '../src';
import * as chai from 'chai';
import * as sinon from 'sinon';
import {setupMockClock} from './util/clock-mock';
import {streamUtil} from './util/stream-util';

const {expect} = chai;


describe('CombineNode', () => {
    let tick = setupMockClock();

    describe('.combine()', () => {
        it('combines events from two streams and resulting stream is runnable', async () => {
            const stream1 = new AStream((x: number) => x);
            const stream2 = new AStream((x: string) => x);

            const combinedCallback = sinon.spy(([num, str]) => [num * 10, str]);
            const combinedStream = stream1.combine([stream2])
                .next(combinedCallback);

            stream1(1);
            stream1(2);
            stream1(3);
            await tick(0);
            expect(combinedCallback.callCount).to.equal(0);
            stream2('a');
            await tick(0);
            expect(combinedCallback.calledWith([3, 'a'])).to.be.true;
            stream2('b');
            await tick(0);
            expect(combinedCallback.calledWith([3, 'b'])).to.be.true;
            const combineResult = await combinedStream(4);
            expect(combinedCallback.calledWith([4, 'b'])).to.be.true;
            expect(combinedCallback.callCount).to.equal(3);
            expect(combineResult).to.eql([40, 'b']);
        });

        it('cancels error events, cancels events before there is a value from each input and forwards canceled events', async () => {
            const stream1 = streamUtil.getDelayableStream();
            const stream2 = streamUtil.getDelayableStream();

            const combinedCallback = sinon.spy();
            const cancelHandlerCallback = sinon.spy();
            stream1.combine([stream2])
                .next(combinedCallback)
                .canceledEventHandler(cancelHandlerCallback);

            stream1({reject: true});
            stream1({cancel: true});
            stream1({value: 'one'});
            stream2({cancel: true});
            await tick(0);

            expect(combinedCallback.callCount).to.equal(0);
            expect(cancelHandlerCallback.callCount).to.equal(4);
            //second call should forward canceled event passed in from streamUtil.getDelayableStream()
            expect(cancelHandlerCallback.getCall(1).args[0].message).to.equal('Canceled');
            //third call is should generate a new canceled event because not all inputs have a value yet
            expect(cancelHandlerCallback.getCall(2).args[0].reason).not.to.equal('Canceled');

            stream2({value: 'two'});
            await tick(0);

            expect(combinedCallback.callCount).to.equal(1);
            expect(combinedCallback.calledWith(['one', 'two'])).to.be.true;

            stream2({reject: true});
            stream1({value: 'hello'});
            await tick(0);

            expect(combinedCallback.callCount).to.equal(2);
            expect(cancelHandlerCallback.callCount).to.equal(5);
            expect(combinedCallback.calledWith(['hello', 'two'])).to.be.true;
        });

        it('obsolete events from one input do not affect other inputs', async () => {
            const stream1 = streamUtil.getDelayableStream();
            const stream2 = streamUtil.getDelayableStream();

            const combinedCallback = sinon.spy();
            stream1.combine([stream2])
                .next(combinedCallback);

            stream1({timeout: 3000}); // not canceled because new event resolves on a different parent
            stream2({timeout: 2000}); // canceled as obsolete
            stream2({timeout: 1000});

            await tick(1000);
            await tick(1000);
            await tick(1000);
            expect(combinedCallback.callCount).to.equal(1);
            expect(combinedCallback.calledWith([3000, 1000])).to.be.true;

            stream1({timeout: 2001});
            stream1({timeout: 4001}); // canceled as obsolete
            stream1({timeout: 3001});

            await tick(2001);
            await tick(1000);
            await tick(1000);
            expect(combinedCallback.callCount).to.equal(3);
            expect(combinedCallback.calledWith([2001, 1000])).to.be.true;
            expect(combinedCallback.calledWith([3001, 1000])).to.be.true;
        });

        it('aggregates pending status from all inputs and can combine many streams.', async () => {
            const stream1 = streamUtil.getDelayableStream();
            const stream2 = streamUtil.getDelayableStream();
            const stream3 = streamUtil.getDelayableStream();
            const stream4 = streamUtil.getDelayableStream();

            const combinedCallback = sinon.spy();
            const combinedStream = stream1.combine([stream2, stream3, stream4])
                .next(combinedCallback);

            stream1({timeout: 1000});
            stream2({timeout: 2000});

            await tick(100);
            //Ideally this wouldn't be pending as even if all events resolve there will be no output from combine...
            //but this is how it is currently implemented
            expect(combinedStream.pending).to.equal(true);

            await tick(2000);
            expect(combinedStream.pending).to.equal(false);

            stream1({timeout: 4000});
            stream2({timeout: 3000});
            stream3({timeout: 2000});
            stream4({timeout: 1000});

            await tick(3000);
            expect(combinedStream.pending).to.equal(true);
            await tick(1000);
            expect(combinedStream.pending).to.equal(false);
        });

    });

});
