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

This library exports four main classes: `OAuthClient`, `LocalStorage` and `SessionStorage`.

```typescript
import {
  OAuthClient
  LocalStorage,
  SessionStorage,
} from '@volverjs/auth-vue'
```

### Storage

`LocalStorage` and `SessionStorage` provide a way to interact with the browser `localStorage` and `sessionStorage` APIs.
All the keys are scoped by the instance name, so you can use the same key name in different storages.

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

### OAuthClient

The `OAuthClient` class is a wrapper of [oauth4webapi](https://github.com/panva/oauth4webapi) to simplify the authentication process of a Vue 3 application.
By default it uses `LocalStorage` to store the refresh token and the code verifier.

```typescript
import { OAuthClient, SessionStorage } from '@volverjs/auth-vue'

const authClient = new OAuthClient({
  // The URL of the OAuth issuer
  url: 'https://my-oauth-server.com',
  // The client id of the application
  clientId: 'my-client-id',
  // The client authentication method, default: 'none'
  // Are also supported: 'client_secret_basic', 'client_secret_post' and 'private_key_jwt'
  tokenEndpointAuthMethod: 'none',
  // The scopes requested to the OAuth server
  scopes: 'openid profile email',
  // The storage to use for persisting the refresh token, default: new LocalStorage('oauth')
  storage: new SessionStorage('my-session-storage')
  // The redirect URI of the application, default: document.location.origin
  redirectUri: 'https://my-app.com/callback',
  // The URI to redirect the user after the logout, default: document.location.origin
  postLogoutRedirectUri: 'https://my-app.com',
})
```

The `OAuthClient` class provides a set of methods to interact with the OAuth server:

```typescript
// initialize the OAuth client
// this method authomaticaly get the access token if the refresh token is present
// and handle the OAuth server authorization code response if the code is present
authClient.initialize()
// redirect the user to the OAuth server to authorize the application
authClient.authorize()
// handle the OAuth server authorization code response
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

To use a `OAuthClient` instance inside a Vue 3 application, you can install the plugin with the `createOAuthClient` function.

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

With the option `global: true` the plugin will inject the `OAuthClient` instance inside the global configuration, so you can access it with `this.$vvAuth` with Vue Options API.

## Composable

`@volverjs/auth-vue` also provides a composable to get the `OAuthClient` instance in script setup or `setup()` function.

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
