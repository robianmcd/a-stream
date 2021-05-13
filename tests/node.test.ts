import {StateStream} from '../src';
import * as chai from 'chai';
import * as sinon from 'sinon';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../src/errors/canceled-a-stream-event';
import {setupMockClock} from './util/clock-mock';
import {streamUtil} from './util/stream-util';

const {expect} = chai;

describe('BaseNode', () => {
    let tick = setupMockClock();

    describe('constructor', () => {
        it('defaults to identity executor when an executor is not provided', async () => {
            const stream = new StateStream<[string], string>();
            let result = await stream('hello');
            expect(result).to.equal('hello');
        });

        it('supports an async executor', async () => {
            let executor = () => Promise.resolve('done');
            const stream = new StateStream(executor);
            let result = await stream();
            expect(result).to.equal('done');
        });

        it('uses initial value from nodeOptions', async () => {
            const stream1Executor = sinon.spy(x => x);
            const stream2Executor = sinon.spy(x => x + 1);
            const stream1 = new StateStream(stream1Executor, {initialValue: 42});
            const stream2 = stream1.next(stream2Executor);

            expect(stream1.value).to.equal(42);
            expect(stream1.status).to.equal('success');

            await tick(0);

            expect(stream1Executor.callCount).to.equal(0);
            expect(stream2Executor.calledWith(42)).to.be.true;
            expect(stream2.status).to.equal('success');
            expect(stream2.value).to.equal(43);
        });
    });

    describe('.run() / ()', () => {
        it('is callable', async () => {
            let executor = (x: number, y: number) => x * y;
            const stream = new StateStream(executor);
            let result = await stream(5, 3);
            expect(result).to.equal(15);

            let result2 = await stream.run(50, 30);
            expect(result2).to.equal(1500);
        });
    });

    describe('current state', () => {
        it('stores current value', async () => {
            const stream1 = new StateStream(x => x);
            const stream2 = stream1.next(x => x * 2);

            expect(stream1.status).to.equal('uninitialized');
            expect(stream1.status).to.equal('uninitialized');

            await stream1(5);
            //Allows stream2 to run
            await tick(0);

            expect(stream1.status).to.equal('success');
            expect(stream1.value).to.equal(5);
            expect(stream1.error).to.equal(undefined);
            expect(stream2.status).to.equal('success');
            expect(stream2.value).to.equal(10);
            expect(stream2.error).to.equal(undefined);

            await stream2(6);

            expect(stream1.status).to.equal('success');
            expect(stream1.value).to.equal(6);
            expect(stream2.status).to.equal('success');
            expect(stream2.value).to.equal(12);
        });

        it('stores errors', async () => {
            const stream1 = new StateStream(x => { throw x; });
            const stream2 = stream1.next(x => x * 2);
            const stream3 = stream2.errorHandler(x => x * 3);
            const stream4 = stream3.next(x => x * 4);

            await stream4(2);

            expect(stream1.status).to.equal('error');
            expect(stream1.value).to.equal(undefined);
            expect(stream1.error).to.equal(2);
            expect(stream2.status).to.equal('error');
            expect(stream2.value).to.equal(undefined);
            expect(stream2.error).to.equal(2);
            expect(stream3.status).to.equal('success');
            expect(stream3.value).to.equal(6);
            expect(stream3.error).to.equal(undefined);
            expect(stream4.status).to.equal('success');
            expect(stream4.value).to.equal(24);
            expect(stream4.error).to.equal(undefined);

            await stream4(1);

            expect(stream4.value).to.equal(12);
        });

        it('ignores AStream errors', async () => {
            const stream1 = new StateStream(x => { throw x; });
            const stream2 = stream1.next(x => 2 * x);

            await stream2(new Error('custom')).catch(() => {});

            expect(stream1.status).to.equal('error');
            expect(stream1.value).to.equal(undefined);
            expect(stream1.error.message).to.equal('custom');
            expect(stream2.status).to.equal('error');
            expect(stream2.value).to.equal(undefined);
            expect(stream2.error.message).to.equal('custom');

            await stream2(new CanceledAStreamEvent(CanceledAStreamEventReason.Skipped,'stream')).catch(() => {});

            expect(stream2.status).to.equal('error');
            expect(stream2.error.message).to.equal('custom');
        });

        it('ignores obsolete events', async () => {
            const stream1 = streamUtil.getDelayableStream();
            const stream2 = stream1.next(x => x + 1);

            stream2({timeout: 2000});
            stream2({timeout: 1000});
            stream2({timeout: 3000});

            await tick(1000);

            expect(stream1.value).to.equal(1000);
            expect(stream2.value).to.equal(1001);

            await tick(1000);

            expect(stream1.value).to.equal(1000);
            expect(stream2.value).to.equal(1001);

            await tick(1000);

            expect(stream1.value).to.equal(3000);
            expect(stream2.value).to.equal(3001);
        });

        it('ignores obsolete errors', async () => {
            const stream1 = streamUtil.getDelayableStream();
            const stream2 = stream1.errorHandler(x => x + 1);

            stream2({timeout: 2000, reject: true});
            stream2({timeout: 1000, reject: true});
            stream2({timeout: 3000, reject: true});

            await tick(1000);

            expect(stream1.error).to.equal(1000);
            expect(stream2.value).to.equal(1001);

            await tick(1000);

            expect(stream1.error).to.equal(1000);
            expect(stream2.value).to.equal(1001);

            await tick(1000);

            expect(stream1.error).to.equal(3000);
            expect(stream2.value).to.equal(3001);
        });
    });

    describe('pending events', () => {
        it('marks nodes as pending while they are running', async () => {
            const stream1 = streamUtil.getDelayableStream();
            const stream2 = stream1.next((x) => {
                return new Promise(resolve => {
                    setTimeout(() => resolve(x), 1000);
                });
            });

            stream2({timeout: 1000});

            expect(stream1.pending).to.be.true;
            expect(stream2.pending).to.be.true;

            await tick(1000);

            expect(stream1.pending).to.be.false;
            expect(stream2.pending).to.be.true;

            await tick(1000);

            expect(stream1.pending).to.be.false;
            expect(stream2.pending).to.be.false;
        });

        it('obsolete events are no longer pending after "latest" node', async () => {
            const stream1 = streamUtil.getDelayableStream();
            const stream2 = stream1.latest();

            stream2({timeout: 1000});
            stream2({timeout: 3000});
            stream2({timeout: 2000});

            expect(stream1.pending).to.be.true;
            expect(stream2.pending).to.be.true;

            await tick(2000);

            expect(stream1.pending).to.be.true;
            expect(stream2.pending).to.be.false;

            await tick(1000);

            expect(stream1.pending).to.be.false;
            expect(stream2.pending).to.be.false;
        });
    });

    describe('.addChild()', () => {
        it('uses ignoreInitialParentState to determine when to send initial parent state', async () => {
            const nextStreamExecutor = sinon.spy(x => x);
            const nextIgnoreStreamExecutor = sinon.spy(x => x);

            const stream = new StateStream(x => x);

            await stream(1);

            const nextStream = stream.next(nextStreamExecutor, {ignoreInitialParentState: false});
            const nextIgnoreStream = stream.next(nextIgnoreStreamExecutor, {ignoreInitialParentState: true});

            await tick(0);

            expect(nextStreamExecutor.calledWith(1)).to.be.true;
            expect(nextStream.status).to.equal('success');
            expect(nextStream.value).to.equal(1);
            expect(nextIgnoreStreamExecutor.callCount).to.equal(0);
            expect(nextIgnoreStream.status).to.equal('uninitialized');
        });

        it('sends pending events from parent', async () => {
            const stream2Executor = sinon.spy(x => x);
            const stream3Executor = sinon.spy(x => x);
            const stream1 = streamUtil.getDelayableStream();

            stream1({timeout: 1000});
            stream1({timeout: 1500});

            const stream2 = stream1.next(stream2Executor);
            await tick(500);
            const stream3 = stream2.next(stream3Executor);

            await tick(1000);

            expect(stream2.value).to.equal(1500);
            expect(stream3.value).to.equal(1500);
            expect(stream2Executor.callCount).to.be.equal(2);
            expect(stream2Executor.calledWith(1000)).to.be.true;
            expect(stream2Executor.calledWith(1500)).to.be.true;
            expect(stream3Executor.callCount).to.be.equal(2);
            expect(stream3Executor.calledWith(1000)).to.be.true;
            expect(stream3Executor.calledWith(1500)).to.be.true;
        })
    });

    describe('.endStream()', () => {
        it('disconnects all nodes in a stream', async () => {
            const nextStreamExecutor = sinon.spy();

            const stream1 = new StateStream(x => x);
            const stream2 = stream1.next(nextStreamExecutor);

            await stream2.endStream();

            expect(stream1.connected).to.be.false;
            expect(stream2.connected).to.be.false;
        });

        it('stops downstream handlers from being called for pending events', async () => {
            const nextStreamExecutor = sinon.spy();

            const stream = streamUtil.getDelayableStream();
            stream.next(nextStreamExecutor);

            stream({timeout: 1000});
            stream.endStream();

            await tick(1000);

            expect(nextStreamExecutor.callCount).to.equal(0);
        });
    });

    describe('.disconnectDownstream()', () => {
        it('disconnects all downstream nodes in branch', async () => {
            const stream1 = new StateStream(x => x);
            const stream2 = stream1.next(x => x);
            const stream3 = stream2.next(x => x);
            const stream4 = stream3.next(x => x);
            const stream5 = stream4.next(x => x);

            stream2.disconnectDownstream(stream4);

            expect(stream1.connected).to.be.true;
            expect(stream2.connected).to.be.true;
            expect(stream3.connected).to.be.false;
            expect(stream4.connected).to.be.false;
            expect(stream5.connected).to.be.false;
        });

        it('throws error if called with a non-downstream node', async () => {
            const stream1 = new StateStream(x => x);
            const stream2 = new StateStream(x => x);
            const stream1A = stream1.next(x => x);

            expect(() => stream1.disconnectDownstream(stream2)).to.throw(Error);
            expect(() => stream1.disconnectDownstream(stream1)).to.throw(Error);
            expect(() => stream1A.disconnectDownstream(stream1)).to.throw(Error);
        });
    });

    describe('.asReadonly()', () => {
        it('prevents non-readonly functionality being executed', function () {
            const stream1 = new StateStream();
            const stream2 = stream1.asReadonly();
            const stream3 = stream2.debounce(300);

            expect(stream2['run']).to.equal(undefined);
            expect(stream3['run']).to.equal(undefined);
            expect(stream2).to.throw(TypeError);
            expect(stream3).to.throw(TypeError);
            expect(stream2['endStream']).to.equal(undefined);
            expect(stream3['endStream']).to.equal(undefined);
            expect(stream2['disconnect']).to.equal(undefined);
            expect(stream3['disconnect']).to.equal(undefined);
        });

        it('doesn\'t prevent readonly functionality', async function () {

            const stream1Executor = sinon.spy((x: number) => x);
            const stream2Executor = sinon.spy(x => x + 1);
            const stream3Executor = sinon.spy();

            const stream1 = new StateStream(stream1Executor);
            const stream2 = stream1.asReadonly().next(stream2Executor);
            const stream3 = stream2.next(stream3Executor);

            stream1(1);
            //Allows stream2 and stream3 to run
            await tick(0);

            expect(stream1Executor.calledWith(1)).to.be.true;
            expect(stream2Executor.calledWith(1)).to.be.true;
            expect(stream3Executor.calledWith(2)).to.be.true;

            stream1.disconnectDownstream(stream3);

            stream1(2);
            //Allows stream2 and stream3 to run
            await tick(0);

            expect(stream1Executor.calledWith(2)).to.be.true;
            expect(stream2Executor.callCount).to.equal(1);
            expect(stream3Executor.callCount).to.equal(1);
        });
    });

    describe('initializing', () => {
        it('resolves when stream receives a value or error', async function () {
            const stream1Initialized = sinon.spy();
            const stream2Initialized = sinon.spy();

            const stream1 = new StateStream(x => {throw x});
            const stream2 = stream1.next(x => x);

            stream1.initializing.then(stream1Initialized);
            stream2.initializing.then(stream2Initialized);

            await tick(0);

            expect(stream1Initialized.callCount).to.equal(0);
            expect(stream2Initialized.callCount).to.equal(0);

            try {
                await stream2(1);
            } catch (e) {

            }

            expect(stream1Initialized.callCount).to.equal(1);
            expect(stream2Initialized.callCount).to.equal(1);
        });

        it('is rejected if stream disconnects before recieving an event', async function () {
            const streamInitializingRejected = sinon.spy();

            const stream = new StateStream(x => x);
            stream.initializing.catch(streamInitializingRejected);

            await tick(0);

            expect(streamInitializingRejected.callCount).to.equal(0);

            await stream.endStream();

            expect(streamInitializingRejected.callCount).to.equal(1);
        });
    });
});
