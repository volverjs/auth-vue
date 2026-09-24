# Migrating from 0.0.x to 1.0.0

## Client authentication (the main breaking change)

The string `tokenEndpointAuthMethod` option was replaced by `clientAuthentication`, which takes a helper function (re-exported from `@volverjs/auth-vue`):

```diff
-import { OAuthClient } from '@volverjs/auth-vue'
+import { ClientSecretBasic, OAuthClient } from '@volverjs/auth-vue'

 new OAuthClient({
   url, clientId,
-  tokenEndpointAuthMethod: 'client_secret_basic',
+  clientAuthentication: ClientSecretBasic('my-client-secret'),
 })
```

Mapping from the old string values:

| `tokenEndpointAuthMethod` (0.0.x) | `clientAuthentication` (1.0.0) |
|---|---|
| `'none'` (default) | omit it (default public client) |
| `'client_secret_basic'` | `ClientSecretBasic('<secret>')` |
| `'client_secret_post'` | `ClientSecretPost('<secret>')` |
| `'private_key_jwt'` | `PrivateKeyJwt(<CryptoKey>)` |
| `'tls_client_auth'` | `TlsClientAuth()` |

## Other changes

- `oauth4webapi` is now **3.x** — review its v3 changelog if you import it directly.
- **Node.js ≥ 20** is required for tooling.
- A `state` is now always sent/validated (CSRF) and a `nonce` when `openid` is requested (OIDC). Make sure your IdP accepts these standard parameters; the client now also stores `state`/`nonce` keys under its storage base key.
- `initialize()` completes a `?code` redirect before attempting a token refresh.
