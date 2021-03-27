# A Stream

Promise based library for building streams of asynchronous events. While this is a general purpose library the API was designed to simplify common async challenges in web development such as:
 - 🌎 global/local state management
 - ⌛ track pending status and errors in events
 - 🚦 debounce and rate limit events
 - 💣 cancel events/handlers
 - 🔮 handle events that resolve out of order
 - 💑 aggregate streams of events and react to changes
 - 💍 Integrate with code/libraries that use Promises
 
AStream includes TypeScript type definitions and has 0 dependencies. It can be imported as an ES Modules, a CommonJS module (Node), or a script tag in the browser. 

 ## Example

```typescript
import {AStream} from './a-stream';

const searchItems = new AStream(event => event.target.value)
    .debounce(300)
    .filter((text, {streamNode}) => text !== streamNode.value)
    .next(text => axios.post('api/items', {text}))
    .latest();

searchItems.pendingChangesStream()
    .next(pending => {
        if(pending) {
          // show loading spinner
        } else {
          // hide loading spinner
        }
    });

async function onTextChange(event) {
    const searchResults = await searchItems(event);
    // do something with search results
}

function onClose() {
    //Cancels pending events and stops handlers from being called
    searchItems.endStream();
}
```


