---
sidebar_position: 2
---

# Global State Management

TODO

```typescript title=user-service.ts
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

```typescript title=login.component.ts
import * as userService from './user-service'

async function onLogin(username, password) {
    await userService.login(username, password);
    router.go('/profile');
}
```

```typescript title=profile.component.ts
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
    userService.getUserStream().disconnectDownstream(this.userStream);
}
```
