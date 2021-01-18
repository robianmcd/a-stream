import {AStream} from '../src';
import {expect} from 'chai';

describe('AStream Tests', () => {
    it('is callable', async () => {
        let executor = (x: number,y: number) => x*y;
        const stream = new AStream(executor);
        let result = await stream(5, 3);
        expect(result).to.eql(15);
    });

    it('supports an async executor', async () => {
        let executor = () => Promise.resolve('done');
        const stream = new AStream(executor);
        let result = await stream();
        expect(result).to.eql('done');
    });

    it('defaults to identity executor when an executor is not provided', async () => {
        const stream = new AStream<[string], string>();
        let result = await stream('hello');
        expect(result).to.eql('hello');
    });

    it('can chain callbacks with .next()', async () => {
        let executor = (x: number) => x*2;
        const stream = new AStream(executor);
        const moneyStream = stream.next(res => {
            return '$' + res;
        });

        let result = await moneyStream(8);
        expect(result).to.eql('$16');
    });
});
