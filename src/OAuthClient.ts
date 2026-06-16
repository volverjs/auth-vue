import type { TokenEndpointRequestOptions } from 'oauth4webapi'
import type { Ref } from 'vue'
import type { Storage } from './Storage'
import * as oauth from 'oauth4webapi'
import { computed, readonly, ref, watch } from 'vue'
import { LocalStorage } from './LocalStorage'
import { SessionStorage } from './SessionStorage'

export type OAuthClientOptions = {
    /**
     * The URL of the OAuth issuer.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     *  url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * ```
     */
    url: string
    /**
     * The client ID of the application.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     *  url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * ```
     */
    clientId: string
    /**
     * The client authentication method, see {@link oauth.ClientAuth}
     * @default 'None()' public client
     * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-2.3)
     * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication)
     * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
     * @example
     * ```typescript
     * const client = new OAuthClient({
     *  url: 'https://example.com',
     * 	clientId: 'my-client-id',
     *  clientAuthentication: ClientSecretBasic('my-client-secret')
     * })
     * ```
     */
    clientAuthentication?: oauth.ClientAuth
    /**
     * The scopes requested to the OAuth server.
     * @default ''
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * 	scopes: 'openid profile email'
     * })
     * ```
     */
    scopes?: string[] | string
    /**
     * The storage to use for persisting the refresh token, the code verifier
     * and the PKCE/OIDC `state` and `nonce` values.
     *
     * Takes precedence over {@link OAuthClientOptions.storageType}: when an
     * explicit instance is provided, `storageType` is ignored.
     *
     * ⚠️ **Security note**: by default the refresh token is persisted in
     * `localStorage`. `localStorage` survives tab closes and browser restarts
     * and is readable by any JavaScript running on the origin, so a single XSS
     * flaw exposes the refresh token. Prefer {@link SessionStorage} (see
     * {@link OAuthClientOptions.storageType}) when you don't need persistent,
     * cross-tab sessions, or provide a custom, more secure storage.
     *
     * @default
     * `new LocalStorage('oauth')`
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * 	storage: new SessionStorage('my-app')
     * })
     * ```
     */
    storage?: Storage
    /**
     * Convenience setting to choose where the refresh token, code verifier and
     * `state`/`nonce` are persisted, without instantiating a storage manually.
     *
     * - `'local'` &rarr; `new LocalStorage('oauth')` (persists across tabs and
     *   browser restarts).
     * - `'session'` &rarr; `new SessionStorage('oauth')` (cleared when the tab
     *   is closed, not shared between tabs).
     *
     * Ignored when {@link OAuthClientOptions.storage} is provided.
     *
     * ⚠️ See the security note on {@link OAuthClientOptions.storage}: prefer
     * `'session'` to reduce the impact of XSS on the refresh token.
     *
     * @default 'local'
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * 	storageType: 'session'
     * })
     * ```
     */
    storageType?: 'local' | 'session'
    /**
     * The redirect URI.
     * @default
     * `document.location.origin`
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * 	redirectUri: 'https://my-app.com/callback'
     * })
     * ```
     */
    redirectUri?: string
    /**
     * The URL to redirect the user after the logout.
     * @default
     * `document.location.origin`
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * 	postLogoutRedirectUri: 'https://my-app.com'
     * })
     * ```
     */
    postLogoutRedirectUri?: string
}

type UndefinedOrNullString = string | undefined | null

/**
 * Storage keys for the values that survive a page reload. Single source of
 * truth so the keys are never duplicated as string literals across the class.
 */
const STORAGE_KEYS = {
    refreshToken: 'refresh_token',
    codeVerifier: 'code_verifier',
    state: 'state',
    nonce: 'nonce',
} as const

/**
 * Build the default storage from the `storageType` option.
 * @param storageType - `'local'` (default) or `'session'`.
 * @returns a {@link LocalStorage} or {@link SessionStorage} scoped to `oauth`.
 */
function createDefaultStorage(
    storageType: OAuthClientOptions['storageType'] = 'local',
): Storage {
    return storageType === 'session'
        ? new SessionStorage('oauth')
        : new LocalStorage('oauth')
}

/**
 * Resolve `document.location.origin` in a SSR-safe way.
 * @returns the current origin, or an empty string when no DOM is available.
 */
function defaultLocationOrigin(): string {
    return typeof globalThis.document === 'undefined'
        ? ''
        : globalThis.document.location.origin
}

/**
 * Normalize the `scopes` option to a single space-separated string.
 * @param scopes - A string, an array of strings, or undefined.
 * @returns the space-separated scope string (empty when none provided).
 */
function normalizeScopes(scopes: OAuthClientOptions['scopes']): string {
    if (typeof scopes === 'string') {
        return scopes
    }
    return scopes?.join(' ') ?? ''
}

export class OAuthClient {
    private _client: oauth.Client
    private _clientAuth: oauth.ClientAuth
    private _issuer: URL
    private _scope: string
    private _storage: Storage
    private _redirectUri: string
    private _postLogoutRedirectUri: string
    private _refreshToken: Ref<UndefinedOrNullString> = ref()
    private _accessToken: Ref<UndefinedOrNullString> = ref()
    private _codeVerifier: Ref<UndefinedOrNullString> = ref()
    private readonly _state: Ref<UndefinedOrNullString> = ref()
    private readonly _nonce: Ref<UndefinedOrNullString> = ref()
    private _authorizationServer?: oauth.AuthorizationServer
    private readonly _loggedIn = computed(() => !!this._accessToken.value)
    private readonly _accessTokenReadonly = readonly(this._accessToken)

    /**
     * Reactive values persisted to storage, each paired with its storage key.
     * Drives loading, resetting and the persistence watchers from one place.
     */
    private readonly _persistedRefs: ReadonlyArray<{
        ref: Ref<UndefinedOrNullString>
        key: string
    }> = [
        { ref: this._refreshToken, key: STORAGE_KEYS.refreshToken },
        { ref: this._codeVerifier, key: STORAGE_KEYS.codeVerifier },
        { ref: this._state, key: STORAGE_KEYS.state },
        { ref: this._nonce, key: STORAGE_KEYS.nonce },
    ]

    constructor(options: OAuthClientOptions) {
        this._issuer = new URL(options.url)
        this._clientAuth = options.clientAuthentication ?? oauth.None()
        this._client = {
            client_id: options.clientId,
        }
        this._scope = normalizeScopes(options.scopes)
        this._storage = options.storage ?? createDefaultStorage(options.storageType)
        this._redirectUri = options.redirectUri ?? defaultLocationOrigin()
        this._postLogoutRedirectUri
            = options.postLogoutRedirectUri ?? defaultLocationOrigin()

        // Load before wiring the watchers so the initial values are not written
        // straight back to storage.
        this._loadFromStorage()

        // `flush: 'sync'` persists each value synchronously as soon as its ref
        // changes. The default ('pre') flush is asynchronous, which would let a
        // navigation (e.g. `document.location.replace` in `logout`/`authorize`)
        // happen before the storage write, losing or leaking tokens.
        for (const { ref: target, key } of this._persistedRefs) {
            watch(target, value => this._storage.set(key, value), {
                flush: 'sync',
            })
        }
    }

    /**
     * (Re)load every persisted value from the current storage.
     */
    private _loadFromStorage() {
        for (const { ref: target, key } of this._persistedRefs) {
            target.value = this._storage.get(key)
        }
    }

    /**
     * Clear every persisted value. The sync watchers remove them from storage.
     */
    private _resetPersisted() {
        for (const { ref: target } of this._persistedRefs) {
            target.value = undefined
        }
    }

    /**
     * Clear the transient PKCE/OIDC values used for a single authorization
     * request (code verifier, state and nonce), without touching the tokens.
     */
    private _clearAuthorizationRequest() {
        this._codeVerifier.value = undefined
        this._state.value = undefined
        this._nonce.value = undefined
    }

    /**
     * Extends the client options.
     * @param options - The options to change.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * client.extend({
     * 	scopes: 'openid profile email'
     * })
     * ```
     */
    public extend = (options: OAuthClientOptions) => {
        if (options.url) {
            this._issuer = new URL(options.url)
            this._authorizationServer = undefined
            this._accessToken.value = undefined
            this._resetPersisted()
        }
        if (options.clientId) {
            this._client.client_id = options.clientId
        }
        if (options.clientAuthentication) {
            this._clientAuth = options.clientAuthentication
        }
        if (options.scopes) {
            this._scope = normalizeScopes(options.scopes)
        }
        if (options.storage || options.storageType) {
            this._storage
                = options.storage ?? createDefaultStorage(options.storageType)
            this._accessToken.value = undefined
            this._loadFromStorage()
        }
        if (options.redirectUri) {
            this._redirectUri = options.redirectUri
        }
        if (options.postLogoutRedirectUri) {
            this._postLogoutRedirectUri = options.postLogoutRedirectUri
        }
    }

    /**
     * Initializes the client and tries to refresh the token if a refresh token is available, see {@link refreshToken}.
     * or handle the code response if a code verifier is available, see {@link handleCodeResponse}.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * await client.initialize()
     * ```
     */
    public initialize = async (options?: TokenEndpointRequestOptions & { accessToken?: string }) => {
        this._authorizationServer = await oauth
            .discoveryRequest(this._issuer)
            .then(response =>
                oauth.processDiscoveryResponse(this._issuer, response),
            )
        const urlParams
            = typeof globalThis.window === 'undefined'
                ? new URLSearchParams()
                : new URLSearchParams(globalThis.window.location.search)
        // Completing an authorization redirect (a fresh code is in the URL and
        // we have the matching code verifier) takes precedence over an existing
        // refresh token, e.g. when re-authenticating while already logged in.
        if (this._codeVerifier.value && urlParams.has('code')) {
            return await this.handleCodeResponse(urlParams)
        }
        if (this._refreshToken.value) {
            return await this.refreshToken(options)
        }
        if (this._codeVerifier.value) {
            // Stale code verifier without a code in the URL: let
            // handleCodeResponse discard it.
            return await this.handleCodeResponse(urlParams)
        }
        if (options?.accessToken) {
            this._accessToken.value = options.accessToken
            return Promise.resolve()
        }
        return Promise.resolve()
    }

    /**
     * Authorize the application redirecting the client to the authorization server.
     * @throws If the client is not initialized.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * await client.initialize()
     * await client.authorize()
     * ```
     */
    public authorize = async () => {
        if (!this._authorizationServer) {
            throw new Error('OAuthClient not initialized')
        }
        this._codeVerifier.value = oauth.generateRandomCodeVerifier()
        this._state.value = oauth.generateRandomState()
        // The `nonce` is an OpenID Connect concept tied to the `id_token`,
        // which is only returned when the `openid` scope is requested. For
        // plain OAuth 2.0 flows we must not send/expect it, otherwise the token
        // response would be (wrongly) required to contain an `id_token`.
        this._nonce.value = this._requestsOpenId()
            ? oauth.generateRandomNonce()
            : undefined
        const codeChallenge = await oauth.calculatePKCECodeChallenge(
            this._codeVerifier.value,
        )
        const authorizationUrl = new URL(
            this._authorizationServer?.authorization_endpoint
            ?? `${this._issuer.toString()}/oauth2/authorize`,
        )
        authorizationUrl.searchParams.set('client_id', this._client.client_id)
        authorizationUrl.searchParams.set('code_challenge', codeChallenge)
        authorizationUrl.searchParams.set('code_challenge_method', 'S256')
        authorizationUrl.searchParams.set('redirect_uri', this._redirectUri)
        authorizationUrl.searchParams.set('response_type', 'code')
        authorizationUrl.searchParams.set('scope', this._scope)
        authorizationUrl.searchParams.set('state', this._state.value)
        if (this._nonce.value) {
            authorizationUrl.searchParams.set('nonce', this._nonce.value)
        }
        globalThis.document.location.replace(authorizationUrl.toString())
    }

    /**
     * Handle the authorization code response.
     * @throws If the client is not initialized.
     * @param urlParams - The URL parameters.
     */
    public handleCodeResponse = async (urlParams: URLSearchParams, options?: oauth.ProcessAuthorizationCodeResponseOptions) => {
        if (!this._authorizationServer) {
            throw new Error('OAuthClient not initialized')
        }
        if (!this._codeVerifier.value) {
            return false
        }
        if (!urlParams.has('code')) {
            this._clearAuthorizationRequest()
            return false
        }
        try {
            const params = oauth.validateAuthResponse(
                this._authorizationServer,
                this._client,
                urlParams,
                this._state.value ?? oauth.expectNoState,
            )
            const response = await oauth.authorizationCodeGrantRequest(
                this._authorizationServer,
                this._client,
                this._clientAuth,
                params,
                this._redirectUri,
                this._codeVerifier.value,
            )
            const result = await oauth.processAuthorizationCodeResponse(
                this._authorizationServer,
                this._client,
                response,
                this._nonce.value
                    ? { expectedNonce: this._nonce.value, ...options }
                    : options,
            )
            this._clearAuthorizationRequest()
            this._accessToken.value = result.access_token
            this._refreshToken.value = result.refresh_token
            return this.accessToken
        }
        catch (e) {
            this._clearAuthorizationRequest()
            throw e
        }
    }

    /**
     * Refresh the access token.
     * @throws If the client is not initialized.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * await client.initialize()
     * await client.refreshToken()
     * ```
     * @returns The new access token.
     */
    public refreshToken = async (options?: TokenEndpointRequestOptions) => {
        if (!this._authorizationServer) {
            throw new Error('OAuthClient not initialized')
        }
        if (!this._refreshToken.value) {
            return false
        }
        try {
            const response = await oauth.refreshTokenGrantRequest(
                this._authorizationServer,
                this._client,
                this._clientAuth,
                this._refreshToken.value,
                options,
            )
            const result = await oauth.processRefreshTokenResponse(
                this._authorizationServer,
                this._client,
                response,
            )
            this._accessToken.value = result.access_token
            this._refreshToken.value = result.refresh_token
            return this.accessToken
        }
        catch (e) {
            // The refresh token is invalid or expired: clear it so that the
            // next initialize() doesn't keep retrying a doomed refresh.
            this._refreshToken.value = undefined
            this._accessToken.value = undefined
            throw e
        }
    }

    /**
     * Logout the user.
     * @param logoutHint - The hint to the Authorization Server about the End-User that is logging out.
     * @throws If the client is not initialized.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * await client.initialize()
     * client.logout()
     * ```
     */
    public logout = (logoutHint?: string) => {
        if (!this._authorizationServer) {
            throw new Error('OAuthClient not initialized')
        }
        this._resetPersisted()
        if (this.loggedIn.value) {
            this._accessToken.value = undefined
            const logoutUrl = new URL(
                this._authorizationServer?.end_session_endpoint
                ?? `${this._issuer.toString()}/oauth2/logout`,
            )
            logoutUrl.searchParams.set(
                'post_logout_redirect_uri',
                this._postLogoutRedirectUri,
            )
            if (logoutHint) {
                logoutUrl.searchParams.set('logout_hint', logoutHint)
            }
            globalThis.document.location.replace(logoutUrl.toString())
        }
    }

    /**
     * Whether the configured scope requests an OpenID Connect `id_token`.
     */
    private _requestsOpenId() {
        return this._scope.split(' ').includes('openid')
    }

    /**
     * Reactive value indicating whether the user is logged in.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * await client.initialize()
     * if (client.loggedIn.value) {
     * 	// User is logged in
     * }
     * ```
     */
    public get loggedIn() {
        return this._loggedIn
    }

    /**
     * Reactive value indicating the access token.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * await client.initialize()
     * if (client.loggedIn.value) {
     * 	// User is logged in
     * 	console.log(client.accessToken.value)
     * }
     * ```
     */
    public get accessToken() {
        return this._accessTokenReadonly
    }

    /**
     * Indicates whether the client has been initialized.
     * @example
     * ```typescript
     * const client = new OAuthClient({
     * 	url: 'https://example.com',
     * 	clientId: 'my-client-id',
     * })
     * if (!client.initialized) {
     * 	await client.initialize()
     * }
     * ```
     */
    public get initialized() {
        return !!this._authorizationServer
    }
}
