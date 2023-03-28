<div align="center">
  
[![volverjs](docs/static/volverjs-auth.svg)](https://volverjs.github.io/auth-vue)

## @volverjs/auth-vue

`oauth` `openid` `vue3` `storage`

<br>

#### proudly powered by

<br>

[![24/Consulting](docs/static/24consulting.svg)](https://24consulting.it)

<br>

</div>

## Install

```bash
# pnpm
pnpm add @volverjs/auth-vue

# yarn
yarn add @volverjs/auth-vue

# npm
npm install @volverjs/auth-vue --save
```

## Usage

This library exports four main classes: `Storage`, `LocalStorage`, `SessionStorage` and `OAuthClient`.

```typescript
import {
  Storage,
  LocalStorage,
  SessionStorage,
  OAuthClient
} from '@volverjs/auth-vue'
```

### Storage

The `Storage` abstract class provides a set of common functions to simplify the `LocalStorage` and `SessionStorge` classes.
If you need to create a custom storage class, you can extend the `Storage` class.

### LocalStorage

The `LocalStorage` class provides a way to interact with the browser `localStorage` API.
All keys are scoped by the `LocalStorage` instance name.

```typescript
import { LocalStorage } from '@volverjs/auth-vue'

if (LocalStorage.suppprted()) {
  const myLocalStorage = new LocalStorage('my-local-storage')
  // set a specific key
  myLocalStorage.set('my-key', 'my-value')
  // get a specific key
  myLocalStorage.get('my-key', 'default-value')
  // delete a specific key
  myLocalStorage.delete('my-key')
  // clear all keys present in our storage
  myLocalStorage.clear()
}
```

### SessionStorage

The `SessionStorage` class provides a way to interact with the browser `sessionStorage` API.
All keys are scoped by the `SessionStorage` instance name.

```typescript
import { SessionStorage } from '@volverjs/auth-vue'

if (SessionStorage.suppprted()) {
  const mySessionStorage = new SessionStorage('my-session-storage')
  // set a specific key
  mySessionStorage.set('my-key', 'my-value')
  // get a specific key
  mySessionStorage.get('my-key', 'default-value')
  // delete a specific key
  mySessionStorage.delete('my-key')
  // clear all keys present in our session storage
  mySessionStorage.clear()
}
```

### OAuthClient

The `OAuthClient` class is a wrapper of [oauth4webapi](https://github.com/panva/oauth4webapi) to simplify the authentication process.
It use the `Storage` to store the refresh token and the code verifier.

```typescript
import { OAuthClient } from '@volverjs/auth-vue'

const authClient = new OAuthClient({
  url: 'https://my-oauth-server.com',
  clientId: 'my-client-id',
  scopes: 'openid profile email'
})
```

The `OAuthClient` class provides a set of methods to interact with the OAuth server:

```typescript
// initialize the OAuth client
authClient.initialize()
// redirect the user to the OAuth server to authorize the application
authClient.authorize()
// handle the OAuth server response
authClient.handleCodeResponse()
// refresh the access token
authClient.refreshToken()
// logout the user
authClient.logout()
```

The `OAuthClient` class also provides a set of getters to retrieve the OAuth status:

```typescript
authClient.loggedIn // the reactive status of the user
authClient.accessToken // the reactive value of the access token
authClient.initialized // check if the OAuth client is initialized
```

## Plugin

To use a `OAuthClient` instance inside a Vue 3 application, you can use the plugin provided by `@volverjs/auth-vue`.

```typescript
import { createApp } from 'vue'
import { createOAuthClient } from '@volverjs/auth-vue'

const app = createApp(App)
const authClient = createOAuthClient({
  url: 'https://my-oauth-server.com',
  clientId: 'my-client-id',
  scopes: 'openid profile email'
})

app.use(authClient, { global: true })
app.mount('#app')
```

With the option `global: true` the plugin will inject the `OAuthClient` instance inside the global configuration, so you can access it with `this.$vvAuth` inside components.

## Composable

`@volverjs/auth-vue` also provides a composable to access the `OAuthClient` instance.

```vue
<template>
  <div>
    <button v-if="!loggedIn" @click="authorize">Login</button>
    <button v-else @click="logout">Logout</button>
  </div>
</template>

<script setup lang="ts">
  import { useAuth } from '@volverjs/auth-vue'
  const client = useOAuthClient()
  const { loggedIn, authorize, logout } = client
</script>
```

## License

[MIT](http://opensource.org/licenses/MIT)
