<div align="center">
  
[![volverjs](docs/static/volverjs-auth.svg)](https://volverjs.github.io/auth-vue)

## @volverjs/auth-vue

`auth` `openid` `session` `localStorage`

<br>

#### proudly powered by

<br>

[![24/Consulting](docs/static/24consulting.svg)](https://24consulting.it)

<br>

</div>

## Install

# pnpm
pnpm add @volverjs/auth-vue

# yarn
yarn add @volverjs/auth-vue

# npm
npm install @volverjs/auth-vue --save

## Usage

This library exports four main classes: `Storage`, `LocalStorage`, `SessionStorage` and `OAuthClient`.

```typescript
import { Storage, LocalStorage, SessionStorage, OAuthClient } from '@volverjs/auth-vue'
```

### Storage

The `Storage` abstract class provides a set of common functions to simplify the `LocalStorage` and `SessionStorge` classes.
If you need to create a custom storage class, you can extend the `Storage` class.

### LocalStorage

The `LocalStorage` class provides a way to interact with the browser `localStorage` API. It also extends the `Storage` class.

```typescript
import { LocalStorage } from '@volverjs/auth-vue'

const myLocalStorage = new LocalStorage('my-local-storage')
myLocalStorage.get('my-key', 'default-value')
myLocalStorage.set('my-key', 'my-value')
myLocalStorage.delete('my-key')
myLocalStorage.clear() // clear all keys present in our storage
myLocalStorage.suppprted() // check if the browser supports localStorage
```

### SessionStorage

The `SessionStorage` class provides a way to interact with the browser `sessionStorage` API. It also extends the `Storage` class.

```typescript
import { SessionStorage } from '@volverjs/auth-vue'

const mySessionStorage = new SessionStorage('my-session-storage')
mySessionStorage.get('my-key', 'default-value')
mySessionStorage.set('my-key', 'my-value')
mySessionStorage.delete('my-key')
mySessionStorage.clear() // clear all keys present in our session storage
mySessionStorage.suppprted() // check if the browser supports sessionStorage
```

### OAuthClient

The `OAuthClient` class is a wrapper of [oauth4webapi](https://github.com/panva/oauth4webapi) to simplify the authentication process. It use the `LocalStorage` class to store the refresh token and the code verifier.

It accepts a specific configuration object:

```typescript
import { type OAuthClientOptions } from '@volverjs/auth-vue'

type OAuthClientOptions = {
	url: string
	clientId: string
	tokenEndpointAuthMethod?: oauth.ClientAuthenticationMethod
	scopes?: string[] | string
	storage?: Storage
	redirectUri?: string
}
```

To create a new `OAuthClient` instance:

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
authClient.initialize() // initialize the OAuth client
authClient.authorize() // redirect the user to the OAuth server to authorize the application
authClient.handleCodeResponse() // handle the OAuth server response
authClient.refreshToken() // refresh the access token
authClient.logout() // logout the user
```

The `OAuthClient` class also provides a set of getters to retrieve the OAuth status:

```typescript
authClient.loggedIn // check if the user is logged in
authClient.accessToken // get the access token
authClient.initialized // check if the OAuth client is initialized
```

## VueJS - Plugin
If you are using VueJS, you can use the `@volverjs/auth-vue` plugin to simplify the authentication process.

### Install

```typescript
import { createApp } from 'vue'
import createOAuthClient from '@volverjs/auth-vue'

const app = createApp(App)
const authClient = createOAuthClient({
  url: 'https://my-oauth-server.com',
  clientId: 'my-client-id',
  scopes: 'openid profile email'
})

app.use(authClient)
app.mount('#app')
```

The plugin will inject the `authClient` object in the VueJS instance. And to use it you can access it with `this.$vvAuth`.

## Composable
If you are using VueJS, you can also use the `@volverjs/auth-vue` composable to simplify the authentication process.

After create the `OAuthClient` instance, you can use the `useOAuthClient` composable to access and manage the authentication status.

```typescript
import { useAuth } from '@volverjs/auth-vue'

const { 
  initialize,
  authorize,
  logout,
  loggedIn,
  accessToken,
  refreshToken
} = useAuth()
```
## License

[MIT](http://opensource.org/licenses/MIT)