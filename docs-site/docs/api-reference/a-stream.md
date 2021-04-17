---
sidebar_position: 1
---

# AStream

`AStream` represents the source node in a stream of asynchronous event handlers. It can receive input data, preform initial handling of the data and attach downstream `BaseStreamNodes` for further handling.


```typescript title="Sample Usage"
import {AStream} from 'a-stream';

const stream = new AStream((x: number, y: number) => x * y);
await stream(6, 7); // returns 42
```

## Constructor

```typescript title="Constructor Signature"
    constructor (
        inputHandler?: (...args: Params) => Promise<TResult> | TResult,
        options?: {initialValue: TResult},
    ) : AStream<Params, TResult>
```

### Parameters

**`inputHandler?: (...args: Params) => Promise<TResult> | TResult`** - Initial handler function for the stream. Can return the resulting value of the node or a promise that resolves with the result. If this function throws an error or returns a promise that gets rejected then the result will be passed to the next node as an error event. Defaults to identity function `x => x`.

**`options?: {initialValue: TResult}`** - Defaults to `{initialValue: undefined}`.
- `initialValue` - Initial value for this node. 
