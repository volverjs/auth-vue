# API reference

## Constructor options

`createOAuthClient(options)` and `new OAuthClient(options)` accept the same `OAuthClientOptions`:

| option | type | default | notes |
|---|---|---|---|
| `url` | `string` | — | **required.** OAuth issuer URL (must expose `/.well-known/openid-configuration`). |
| `clientId` | `string` | — | **required.** |
| `scopes` | `string \| string[]` | `''` | include `openid` for OIDC, `offline_access` for a refresh token. |
| `clientAuthentication` | `ClientAuth` | `None()` (public client) | confidential clients only — see below. |
| `storage` | `Storage` | `new LocalStorage('oauth')` | custom persistence; takes precedence over `storageType`. |
| `storageType` | `'local' \| 'session'` | `'local'` | convenience switch between `localStorage` / `sessionStorage`. |
| `redirectUri` | `string` | `document.location.origin` | must match the IdP config. |
| `postLogoutRedirectUri` | `string` | `document.location.origin` | where the IdP returns after logout. |
| `resource` | `string \| string[]` | — | resource indicator(s) (RFC 8707), sent as `resource` on the authorization request and on both token requests. Needed when the server only issues a **JWT** access token for a stated audience, which is what a resource server validating locally against a JWKS requires. An array repeats the parameter; `[]` clears it through `extend()`. A `resource` passed in a call's `additionalParameters` overrides it. |

## Methods and reactive getters

Network methods are `async`. `authorize`/`handleCodeResponse`/`refreshToken`/`logout` throw if called before `initialize()`.

| member | description |
|---|---|
| `await initialize(opts?)` | OAuth-server discovery, then auto-completes login (if a `?code` is in the URL) or refreshes the token (if one is stored). Call once on app start. `opts` accepts `{ accessToken }` to seed a token plus any `oauth4webapi` token-request options. |
| `await authorize()` | redirect to the IdP to log in (PKCE `S256`, `state`, and `nonce` when `openid` is requested). |
| `await handleCodeResponse(params, opts?)` | manually complete the code exchange from a `URLSearchParams`; returns the access token ref or `false`. Usually unnecessary — `initialize()` does this. |
| `await refreshToken(opts?)` | refresh the access token; clears the stored refresh token on failure so a doomed refresh isn't retried. |
| `logout(logoutHint?)` | clear tokens/transient values and redirect to the IdP end-session endpoint. |
| `extend(options)` | change config at runtime (e.g. switch issuer or storage); resets relevant state. |
| `loggedIn` | `ComputedRef<boolean>` — reactive. Use `.value` in script, auto-unwrapped in template. |
| `accessToken` | readonly `Ref<string \| undefined>` — reactive. |
| `initialized` | `boolean` — `true` once discovery completed. |

## Composable

`useOAuthClient(options?)` returns the installed client. It must be called inside `setup()` and throws if the plugin isn't installed. Passing `options` calls `extend(options)` on the client before returning it.

## Confidential-client authentication

For clients with a secret (not browser SPAs), set `clientAuthentication` with a helper re-exported from `@volverjs/auth-vue`:

```ts
import {
    ClientSecretBasic,
    ClientSecretPost,
    createOAuthClient,
    PrivateKeyJwt,
    TlsClientAuth,
} from '@volverjs/auth-vue'

createOAuthClient({
    url,
    clientId,
    clientAuthentication: ClientSecretBasic('my-client-secret'),
})
```

For a browser SPA, leave `clientAuthentication` unset (the default is a public client) and rely on PKCE — never ship a client secret to the browser.
