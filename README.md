# A Stream

Library for managing asynchronous events.

 - Integrates well with code/libraries that use Promises
 - Can be imported as an ES Modules, a CommonJS module (Node), or a script tag in the browser 
 - 0 dependencies
 - Includes TypeScript type definitions

 ## Examples

 ###Global State Management

**user-service.ts**
```typescript
const userStream = new AStream((username, password) => {
    return axios.post('/api/login', {username, password})
        .then(response => response.data);
});

export function login(username, password) {
    return userStream(username, password);
}

export function getUserStream() {
    return this.userStream.asReadonly();
}

export function isLoggedIn() {
    return this.userStream.hasValue();
}
```

**login.component.ts**
```typescript
import * as userService from './user-service'

async function onLogin(username, password) {
    await userService.login(username, password);
    router.go('/profile');
}
```

**profile.component.ts**
```typescript
import * as userService from './user-service'



function onInit(setState) {
    if (!userService.isLoggedIn()) {
        router.go('/login');
    }
    
    this.userStream = userService.getUserStream()
        .next(user => {
            setState({user});
            return user;
        });
}

function render(state) {
    return `Hello ${state.user.name}`;
}

function onCleanup() {
    userService.getUserStream().removeChildNode(this.userStream);
}
```
