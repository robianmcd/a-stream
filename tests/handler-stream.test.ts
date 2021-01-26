import {AStream} from '../src';
import * as chai from 'chai';

const {expect} = chai;


describe('HandlerStream', () => {

    describe('.next()', () => {
        it('can chain together 2 streams', async () => {
            const moneyStream = new AStream((x: number) => x * 2)
                .next(x => '$' + x);

            let result = await moneyStream(8);
            expect(result).to.equal('$16');
        });

        it('Run stream from any stream in a tree', async () => {
            const stream1 = new AStream(x => x * 2);
            const stream2A = stream1.next(x => x + 2);
            const stream2B = stream1.next(x => x + 3);
            const stream2A1 = stream2A.next(x => x);
            const stream2A2 = stream2A.next(x => x - 100);

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

});
