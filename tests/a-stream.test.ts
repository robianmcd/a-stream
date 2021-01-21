import {AStream} from '../src';
import * as chai from 'chai';
const {expect} = chai;
import * as sinon from 'sinon';


describe('AStream', () => {
    let clock;
    let tick;
    beforeEach(function () {
        const nativeSetImmediate = setImmediate;
        clock = sinon.useFakeTimers();

        //Based on https://github.com/sinonjs/sinon/issues/738#issuecomment-428370425
        tick = async ms => {
            await new Promise(resolve => nativeSetImmediate(resolve));
            clock.tick(ms);
            await new Promise(resolve => nativeSetImmediate(resolve));
        }
    });

    afterEach(function () {
        clock.restore();
    });

    describe('constructor', () => {
        it('defaults to identity executor when an executor is not provided', async () => {
            const stream = new AStream<[string], string>();
            let result = await stream('hello');
            expect(result).to.equal('hello');
        });

        it('supports an async executor', async () => {
            let executor = () => Promise.resolve('done');
            const stream = new AStream(executor);
            let result = await stream();
            expect(result).to.equal('done');
        });
    });

    describe('.run() / ()', () => {
        it('is callable', async () => {
            let executor = (x: number,y: number) => x*y;
            const stream = new AStream(executor);
            let result = await stream(5, 3);
            expect(result).to.equal(15);
        });
    });

    describe('.next()', () => {
        it('can chain together 2 streams', async () => {
            const moneyStream = new AStream((x: number) => x*2)
                .next(x => '$' + x);

            let result = await moneyStream(8);
            expect(result).to.equal('$16');
        });

        it('Run stream from any stream in a tree', async () => {
            const stream1 = new AStream(x => x*2);
            const stream2A = stream1.next(x => x+2);
            const stream2B = stream1.next(x => x+3);
            const stream2A1 = stream2A.next(x => x);
            const stream2A2 = stream2A.next(x => x-100);

            const stream1Result = await stream1(10);
            const stream2AResult = await stream2A(10);
            const stream2BResult = await stream2B(10);
            const stream2A1Result = await stream2A1(1);
            const stream2A2Result = await stream2A2(1);

            expect(stream1Result).to.equal(20);
            expect(stream2AResult).to.equal(22);
            expect(stream2BResult).to.equal(23);
            expect(stream2A1Result).to.equal(4);
            expect(stream2A2Result).to.equal(-96);
        });
    });

    describe('.debounce()', () => {
        it('Waits to send out single event', async () => {
            let input = 'data';
            let output = undefined;

            const debouncedStream = new AStream(x => x)
                .debounce(1000);
            debouncedStream(input).then(x => output = x);

            await tick(900);

            expect(output).to.equal(undefined);

            await tick(200);

            expect(output).to.equal(input);
        });

        it('Ignores skipped events', async () => {
            const debouncedStream = new AStream(x => x)
                .debounce(1000);

            const callback1 = sinon.spy();
            debouncedStream('event').then(callback1);
            await tick(900);

            const callback2 = sinon.spy();
            debouncedStream('event').then(callback2);
            await tick(1100);

            const callback3 = sinon.spy();
            debouncedStream('event').then(callback3);
            await tick(100);

            const callback4 = sinon.spy();
            debouncedStream('event').then(callback4);
            await tick(200);

            const callback5 = sinon.spy();
            debouncedStream('event').then(callback5);
            await tick(2000);

            expect(callback1.called).to.be.false;
            expect(callback2.called).to.be.true;
            expect(callback3.called).to.be.false;
            expect(callback4.called).to.be.false;
            expect(callback5.called).to.be.true;
        });
    });

});
