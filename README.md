<div align="center">

[![volverjs](docs/static/volverjs-auth.svg)](https://volverjs.github.io/auth-vue)

## @volverjs/auth-vue

`oauth` `openid` `vue3` `storage`

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=volverjs_auth-vue&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=volverjs_auth-vue) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=volverjs_auth-vue&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=volverjs_auth-vue) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=volverjs_auth-vue&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=volverjs_auth-vue) [![Depfu](https://badges.depfu.com/badges/0d2dd36acf771e7b66ddbb861ec96160/status.svg)](https://depfu.com) [![Depfu](https://badges.depfu.com/badges/0d2dd36acf771e7b66ddbb861ec96160/overview.svg)](https://depfu.com/github/volverjs/auth-vue?project_id=38568)

<br>

maintained with ❤️ by

<br>

[![8 Wave](docs/static/8wave.svg)](https://8wave.it)

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

This library exports three main classes: `OAuthClient`, `LocalStorage` and `SessionStorage` (plus the abstract `Storage` base class).

```typescript
import { LocalStorage, OAuthClient, SessionStorage } from '@volverjs/auth-vue'
```

### Storage

`LocalStorage` and `SessionStorage` provide a way to interact with the browser `localStorage` and `sessionStorage` APIs.
All the keys are scoped by the instance name, so you can use the same key name in different storages.

```typescript
import { LocalStorage } from '@volverjs/auth-vue'

if (LocalStorage.supported()) {
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
By default it uses `LocalStorage` to store the refresh token, the code verifier and the PKCE/OIDC `state` and `nonce` values.

> [!WARNING]
> By default the refresh token is persisted in `localStorage`, which survives
> tab closes and browser restarts and is readable by any JavaScript on the
> origin (a single XSS flaw exposes it). Set `storageType: 'session'` (or
> provide a custom storage) when you don't need persistent, cross-tab sessions.

```typescript
import { ClientSecretBasic, OAuthClient, SessionStorage } from '@volverjs/auth-vue'

const authClient = new OAuthClient({
    // The URL of the OAuth issuer
    url: 'https://my-oauth-server.com',
    // The client id of the application
    clientId: 'my-client-id',
    // The client authentication method, default: None()
    // Are also supported: ClientSecretPost, ClientSecretBasic, PrivateKeyJwt, None, TlsClientAuth
    clientAuthentication: ClientSecretBasic('my-client-secret'),
    // The scopes requested to the OAuth server
    scopes: 'openid profile email',
    // Convenience setting to choose the storage, default: 'local'
    // Use 'session' to persist into sessionStorage instead of localStorage
    storageType: 'session',
    // The storage to use for persisting the refresh token, default: new LocalStorage('oauth')
    // Takes precedence over `storageType` when provided
    storage: new SessionStorage('my-session-storage'),
    // The redirect URI of the application, default: document.location.origin
    redirectUri: 'https://my-app.com/callback',
    // The URI to redirect the user after the logout, default: document.location.origin
    postLogoutRedirectUri: 'https://my-app.com',
    // The API the access token is for (RFC 8707), sent as `resource` on the
    // authorization and token requests. Some servers only issue a JWT access
    // token, instead of an opaque one, when the audience is stated this way.
    // Pass an array to request more than one audience.
    resource: 'https://my-oauth-server.com/api',
})
```

The `OAuthClient` class provides a set of (async) methods to interact with the OAuth server:

```typescript
// initialize the OAuth client (performs OAuth server discovery)
// when a code is present in the URL it completes the authorization code flow,
// otherwise it refreshes the access token if a refresh token is available
await authClient.initialize()
// redirect the user to the OAuth server to authorize the application
await authClient.authorize()
// handle the OAuth server authorization code response manually
// (usually not needed: initialize() does it for you)
await authClient.handleCodeResponse(new URLSearchParams(window.location.search))
// refresh the access token
await authClient.refreshToken()
// logout the user: redirects to the end-session endpoint with the last
// id token as `id_token_hint` (OIDC RP-Initiated Logout)
authClient.logout()
```

The `OAuthClient` class also provides a set of getters to retrieve the OAuth status:

```typescript
authClient.loggedIn // the reactive status of the user (ComputedRef<boolean>)
authClient.accessToken // the reactive value of the access token (readonly Ref)
authClient.idToken // the reactive value of the OpenID Connect id token (readonly Ref)
authClient.initialized // check if the OAuth client is initialized
```

### Security

The authorization flow uses [PKCE](https://www.rfc-editor.org/rfc/rfc7636) (`S256`).
A random `state` is always generated, sent and validated to protect against CSRF.
When the `openid` scope is requested, a random `nonce` is also generated, sent and
validated against the returned `id_token` (OpenID Connect replay protection).

## Plugin

To use a `OAuthClient` instance inside a Vue 3 application, you can install the plugin with the `createOAuthClient` function.

```typescript
import { createOAuthClient } from '@volverjs/auth-vue'
import { createApp } from 'vue'

const app = createApp(App)
const authClient = createOAuthClient({
    url: 'https://my-oauth-server.com',
    clientId: 'my-client-id',
    scopes: 'openid profile email',
})

app.use(authClient, { global: true })
app.mount('#app')
```

With the option `global: true` the plugin will inject the `OAuthClient` instance inside the global configuration, so you can access it with `this.$vvAuth` in Vue Options API.

## Composable

`@volverjs/auth-vue` also provides a composable to get the `OAuthClient` instance in script setup or `setup()` function.

```vue
<script setup lang="ts">
import { useOAuthClient } from '@volverjs/auth-vue'

const client = useOAuthClient()
const { loggedIn, authorize, logout } = client
</script>

<template>
    <div>
        <button v-if="!loggedIn" @click="authorize">
            Login
        </button>
        <button v-else @click="logout">
            Logout
        </button>
    </div>
</template>
```

## Migrating from 0.0.x

### Client authentication

The `tokenEndpointAuthMethod` option (a string) has been replaced by the
`clientAuthentication` option, which accepts a client authentication helper from
[oauth4webapi](https://github.com/panva/oauth4webapi) (re-exported by this package).

```diff
-import { OAuthClient } from '@volverjs/auth-vue'
+import { ClientSecretBasic, OAuthClient } from '@volverjs/auth-vue'

 const authClient = new OAuthClient({
     url: 'https://my-oauth-server.com',
     clientId: 'my-client-id',
-    tokenEndpointAuthMethod: 'client_secret_basic',
+    clientAuthentication: ClientSecretBasic('my-client-secret'),
 })
```

Mapping from the old string values to the new helpers:

| `tokenEndpointAuthMethod` (0.0.x) | `clientAuthentication` (1.0.0)      |
| --------------------------------- | ----------------------------------- |
| `'none'` (default)                | `None()` (default, can be omitted)  |
| `'client_secret_basic'`           | `ClientSecretBasic('<secret>')`     |
| `'client_secret_post'`            | `ClientSecretPost('<secret>')`      |
| `'private_key_jwt'`               | `PrivateKeyJwt(<CryptoKey>)`        |
| `'tls_client_auth'`               | `TlsClientAuth()`                   |

All helpers are exported from `@volverjs/auth-vue`:

```typescript
import {
    ClientSecretBasic,
    ClientSecretPost,
    PrivateKeyJwt,
    TlsClientAuth,
} from '@volverjs/auth-vue'
```

### Other changes

- **`oauth4webapi` is now 3.x.** If you import it directly alongside this package, review its [v3 changelog](https://github.com/panva/oauth4webapi/releases).
- **Node.js >= 20** is required.
- **CSRF/OIDC hardening (no action required).** A `state` is now always sent and validated, and a `nonce` is sent and validated whenever the `openid` scope is requested. Make sure your authorization server accepts these standard parameters. The client now stores two additional keys (`state`, `nonce`) in the configured storage, scoped under the same base key.
- **`initialize()` precedence.** When a `code` is present in the URL, the authorization code flow is now completed before any token refresh.

## Acknowledgements

`@volverjs/auth-vue` is based on [oauth4webapi](https://github.com/panva/oauth4webapi), an OpenID Connect certified client for web applications.

## License

[MIT](http://opensource.org/licenses/MIT)
