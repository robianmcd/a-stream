<h1 align="center">
  <a href="https://robianmcd.github.io/a-stream/">
    AStream
  </a>
</h1>

<p align="center">
  <a href="https://robianmcd.github.io/a-stream/">
    <img src="docs-site/static/img/logo.svg" alt="astream-logo" width="120px" height="120px"/>
  </a>
  
  <br>
  <i>Promise based library for building streams of asynchronous events.</i>
  <br>
</p>

<p align="center">
  <a href="https://robianmcd.github.io/a-stream/"><strong>robianmcd.github.io/a-stream</strong></a>
  <br>
</p>

While AStream is a general purpose library the API was designed to simplify common async challenges in web development such as:
 - 🌎 global/local state management
 - ⌛ track pending status and errors in events
 - 🚦 debounce and rate limit events
 - 💣 cancel events/handlers
 - 🔮 handle events that resolve out of order
 - 💑 aggregate streams of events and react to changes
 - 💍 Integrate with code/libraries that use Promises
 
AStream includes TypeScript type definitions and has 0 dependencies. It can be imported as an ES Modules, a CommonJS module (Node), or a script tag in the browser. 

 ## Demo - Built a Typeahead

```typescript
import {AStream} from 'a-stream';

const searchItems = new AStream(event => event.target.value)
    .debounce(300)
    .filter((text, {streamNode}) => text !== streamNode.value)
    .next(text => axios.post('api/items', {text}));

searchItems.pendingChangesStream()
    .next(pending => showLoadingSpinner(pending));

function onTextChange(event) {
    searchItems(event)
        .then(searchResults => showResults(searchResults));
}
```

https://user-images.githubusercontent.com/4347752/115791918-8ce9a680-a386-11eb-9f38-120dc2cab7e0.mp4
