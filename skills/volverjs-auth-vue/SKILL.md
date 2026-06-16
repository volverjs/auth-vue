---
name: volverjs-auth-vue
description: Integrate OAuth2 / OpenID Connect authentication into a Vue 3 app with @volverjs/auth-vue. Use when adding login/logout, the authorization-code + PKCE flow, token refresh, an access token for API calls, route guards, or reactive auth state (loggedIn/accessToken) to a Vue 3 application.
---

`@volverjs/auth-vue` is a thin, reactive Vue 3 wrapper around [oauth4webapi](https://github.com/panva/oauth4webapi) for the **OAuth 2.0 Authorization Code flow with PKCE** (and OpenID Connect). It runs **in the browser only** and gives you reactive `loggedIn` / `accessToken` state, automatic token persistence, refresh, and logout.

Use this skill to wire it into a consuming Vue app. It does **not** require running this repo — it's reference for integrating the published package.

## Install

```bash
pnpm add @volverjs/auth-vue   # peer dependency: vue ^3.5
```

## Mental model

- **One client** holds all config and reactive state. Create it once.
- **`initialize()`** is the entry point you call on app start. After OAuth-server discovery it automatically:
  1. completes login if a `?code=...` is present in the URL (returning from the IdP),
  2. otherwise refreshes the access token if a refresh token is stored,
  3. otherwise stays logged out.
- **`authorize()`** sends the user to the IdP to log in. **`logout()`** sends them to the IdP to log out.
- The refresh token, code verifier and `state`/`nonce` are persisted to `localStorage` by default (scoped under an `oauth.` key prefix).

## Setup as a Vue plugin (recommended)

`main.ts`:

```ts
import { createOAuthClient } from '@volverjs/auth-vue'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

const auth = createOAuthClient({
    url: 'https://my-idp.example.com', // OAuth issuer (must expose /.well-known/openid-configuration)
    clientId: 'my-spa-client-id',
    scopes: 'openid profile email offline_access', // offline_access → get a refresh token
    redirectUri: `${location.origin}/callback`, // must be registered at the IdP
    postLogoutRedirectUri: location.origin,
})

// Discovery + auto-complete login if returning from the IdP, before mount.
await auth.initialize()

app.use(auth, { global: true }) // { global: true } also exposes this.$vvAuth in Options API
app.mount('#app')
```

Then in any component get the client with the composable:

```vue
<script setup lang="ts">
import { useOAuthClient } from '@volverjs/auth-vue'

const auth = useOAuthClient() // must be called inside setup()
// auth.loggedIn  → ComputedRef<boolean>
// auth.accessToken → readonly Ref<string | undefined>
</script>

<template>
  <button v-if="!auth.loggedIn.value" @click="auth.authorize()">Login</button>
  <button v-else @click="auth.logout()">Logout</button>
</template>
```

## Setup as a standalone instance (no plugin)

```ts
import { OAuthClient } from '@volverjs/auth-vue'

export const auth = new OAuthClient({
    url: 'https://my-idp.example.com',
    clientId: 'my-spa-client-id',
    scopes: ['openid', 'profile'],
})

await auth.initialize()
// import { auth } wherever you need it; loggedIn/accessToken are reactive.
```

## The login round-trip

1. User clicks Login → `auth.authorize()` → browser redirects to the IdP (with PKCE `code_challenge`, `state`, and `nonce` when `openid` is requested).
2. IdP redirects back to `redirectUri` with `?code=...&state=...`.
3. On that page, `auth.initialize()` sees the `code` and completes the exchange automatically — `loggedIn` flips to `true` and `accessToken` is populated.

If you handle the callback on a dedicated route and want to do it explicitly:

```ts
import { useOAuthClient } from '@volverjs/auth-vue'

const auth = useOAuthClient()
await auth.initialize() // discovery
await auth.handleCodeResponse(new URLSearchParams(location.search))
// then router.replace('/') to drop the ?code=... from the URL
```

## API reference

`createOAuthClient(options)` / `new OAuthClient(options)` — options:

| option | type | default | notes |
|---|---|---|---|
| `url` | `string` | — | **required.** OAuth issuer URL. |
| `clientId` | `string` | — | **required.** |
| `scopes` | `string \| string[]` | `''` | include `openid` for OIDC, `offline_access` for a refresh token. |
| `clientAuthentication` | `ClientAuth` | `None()` | confidential clients only — see below. |
| `storage` | `Storage` | `new LocalStorage('oauth')` | custom persistence; takes precedence over `storageType`. |
| `storageType` | `'local' \| 'session'` | `'local'` | convenience switch between `localStorage` / `sessionStorage`. |
| `redirectUri` | `string` | `document.location.origin` | must match the IdP config. |
| `postLogoutRedirectUri` | `string` | `document.location.origin` | |

Methods (all the network ones are `async`):

| member | description |
|---|---|
| `await initialize(opts?)` | discovery + auto login/refresh. Call once on app start. Accepts `{ accessToken }` to seed a token. |
| `await authorize()` | redirect to the IdP to log in. Throws if not initialized. |
| `await handleCodeResponse(params, opts?)` | manually complete the code exchange from `URLSearchParams`. |
| `await refreshToken(opts?)` | refresh the access token; clears the refresh token on failure. |
| `logout(logoutHint?)` | clear tokens and redirect to the IdP end-session endpoint. |
| `extend(options)` | change config at runtime (e.g. switch issuer/storage). |
| `loggedIn` | `ComputedRef<boolean>` (reactive). |
| `accessToken` | readonly `Ref<string \| undefined>` (reactive). |
| `initialized` | `boolean` — discovery done. |

`useOAuthClient(options?)` — composable; returns the installed client. Pass `options` to `extend()` it. Throws if called outside `setup()` or if the plugin isn't installed.

## Common patterns

**Attach the access token to API requests** (reactive — re-reads the current token):

```ts
import { useOAuthClient } from '@volverjs/auth-vue'

export function useApi() {
  const auth = useOAuthClient()
  return (input: RequestInfo, init: RequestInit = {}) =>
    fetch(input, {
      ...init,
      headers: {
        ...init.headers,
        ...(auth.accessToken.value
          ? { Authorization: `Bearer ${auth.accessToken.value}` }
          : {}),
      },
    })
}
```

**Vue Router guard** — require login, kicking off `authorize()` when needed:

```ts
router.beforeEach((to) => {
  const auth = /* your singleton or app-level client */
  if (to.meta.requiresAuth && !auth.loggedIn.value) {
    auth.authorize() // redirects to the IdP
    return false
  }
})
```

**Confidential clients** (server-side / has a secret) — set `clientAuthentication`:

```ts
import { ClientSecretBasic, createOAuthClient } from '@volverjs/auth-vue'
// also exported: ClientSecretPost, PrivateKeyJwt, TlsClientAuth

createOAuthClient({
  url, clientId,
  clientAuthentication: ClientSecretBasic('my-client-secret'),
})
```

For a browser SPA leave `clientAuthentication` unset (the default is a public client) and rely on PKCE — never ship a client secret to the browser. The helpers `ClientSecretBasic`, `ClientSecretPost`, `PrivateKeyJwt` and `TlsClientAuth` are re-exported from `@volverjs/auth-vue`.

## Storage & security

- **Default is `localStorage`**, which survives restarts and is readable by any JS on the origin (a single XSS exposes the refresh token). Prefer `storageType: 'session'` when you don't need persistent, cross-tab sessions, or pass a custom `storage`.
- PKCE (`S256`) and a random `state` (CSRF protection) are always used; a `nonce` (OIDC replay protection) is added and validated only when the `openid` scope is requested.
- Keys are scoped under the storage base key (default `oauth.`), so multiple instances don't collide.

## Gotchas

- **Browser-only (SSR/Nuxt):** the client touches `document`/`window`/Web Storage. Construction is SSR-safe, but call `initialize()`/`authorize()` on the **client** (e.g. `onMounted`, a client-only plugin, or guarded by `import.meta.client`).
- **No refresh token?** Add the `offline_access` scope (or the IdP's equivalent) — otherwise `initialize()` can't restore a session after reload and the user must log in again.
- **`openid` requires an `id_token`:** when the `openid` scope is set, the token response must include a (signed) `id_token` or the exchange fails. Standard IdPs do this; bare OAuth2 servers may not — drop `openid` for pure OAuth2.
- **`redirectUri` mismatch** is the most common setup error: it must exactly match what's registered at the IdP.
- **Clean the URL after login:** `?code=...&state=...` stays in the address bar after `initialize()` completes the exchange; `router.replace(location.pathname)` to remove it.
- **Reactivity:** in `<script>` use `auth.loggedIn.value` / `auth.accessToken.value`; in `<template>` they auto-unwrap.

## Migrating from 0.0.x

The string `tokenEndpointAuthMethod` option was replaced by `clientAuthentication` (a helper function):

```diff
-import { OAuthClient } from '@volverjs/auth-vue'
+import { ClientSecretBasic, OAuthClient } from '@volverjs/auth-vue'

 new OAuthClient({
   url, clientId,
-  tokenEndpointAuthMethod: 'client_secret_basic',
+  clientAuthentication: ClientSecretBasic('my-client-secret'),
 })
```

`'none'` → omit it (the default public client), `'client_secret_post'` → `ClientSecretPost(...)`, `'private_key_jwt'` → `PrivateKeyJwt(...)`, `'tls_client_auth'` → `TlsClientAuth()`. Also: `oauth4webapi` is now 3.x and Node ≥ 20 is required for tooling.
