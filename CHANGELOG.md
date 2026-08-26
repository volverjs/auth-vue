# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- OIDC RP-Initiated Logout hints: `logout()` now sends the last id token as `id_token_hint`, together with `client_id`, on the end-session redirect. Both parameters are optional per spec, but many authorization servers require the hint to identify the session to terminate.
- `idToken` getter: the OpenID Connect id token as a readonly reactive ref. It is persisted next to the refresh token, so the logout hint survives a page reload.
- Resource indicators (RFC 8707): the new `resource` option (string or array) is sent on the authorization request and on both token requests. `handleCodeResponse()` and `initialize()` now accept request options with `additionalParameters`, like `refreshToken()` already did; a `resource` passed per call overrides the configured one.

### Changed

- Dependencies update.

## [1.0.0] - 2026-06-16

First stable release.

### Added

- `storageType` option (`'local' | 'session'`) to choose where the refresh token, code verifier and `state`/`nonce` are persisted, without instantiating a storage manually.
- CSRF protection: a random `state` is now generated, sent and validated during the authorization code flow.
- OpenID Connect `nonce`: generated, sent and validated against the returned `id_token` when the `openid` scope is requested.
- Type augmentation for `this.$vvAuth` (Vue Options API) when the plugin is installed with `{ global: true }`.
- SSR-safe construction: no access to `document`/`window` at import or server-side rendering time.

### Changed

- **Breaking:** upgraded `oauth4webapi` to 3.x.
- **Breaking:** removed the `tokenEndpointAuthMethod` option from the `OAuthClient` constructor; use `clientAuthentication` instead.
- `initialize()` now completes an authorization code redirect (a `code` present in the URL) before attempting a token refresh.
- A failed token refresh now clears the stored refresh token instead of retrying a doomed refresh on every `initialize()`.
- `loggedIn` and `accessToken` now return stable reactive references instead of a new one on every access.
- Storage persistence is now synchronous, so values are written before a navigation (`logout`/`authorize`).
- Migrated the type generation from `vite-plugin-dts` to `unplugin-dts`.
- Set `moduleResolution` to `bundler` and the `vue` peer dependency to `^3.5.0`.
- Dependencies update.

### Fixed

- Storage keys are now scoped using a prefix match, preventing collisions for keys that contain the base key as a substring.
- `Storage.clear()` no longer skips entries (keys are collected before deletion) and is a no-op when no base key is set, so it never wipes unrelated storage.
- `Storage.has()` no longer reads the value twice.
- Fixed `OauthClient` casing to `OAuthClient` in `exports` and `typesVersions`.
- Corrected the README and JSDoc examples (composable import, storage support typo, `get()` returning `undefined` for a missing key).

## [0.0.3] - 2024-10-02

### Added

- `refreshToken()` options parameter.

### Fixed

- Dependencies update.

## [0.0.2] - 2023-05-15

### Added

- Test with Vitest.

## [0.0.1] - 2023-03-28

### Added

- `LocalStorage` a class to store data in the browser's local storage;
- `SessionStorage` a class to store data in the browser's session storage;
- `OAuthClient` a class to handle OAuth2 authentication.

[1.0.0]: https://github.com/volverjs/auth-vue/compare/v0.0.3...v1.0.0
[0.0.3]: https://github.com/volverjs/auth-vue/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/volverjs/auth-vue/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/volverjs/auth-vue/releases/tag/v0.0.1
