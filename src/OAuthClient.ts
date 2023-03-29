import * as oauth from 'oauth4webapi'
import { computed, readonly, ref, watch, type Ref } from 'vue'
import type { Storage } from './Storage'
import { LocalStorage } from './LocalStorage'

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
	 * The client ID of the applicatio.
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
	 * The client authentication method, see {@link oauth.ClientAuthenticationMethod}
	 * @default 'none' public client
	 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-2.3)
	 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication)
	 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
	 * @example
	 * ```typescript
	 * const client = new OAuthClient({
	 *  url: 'https://example.com',
	 * 	clientId: 'my-client-id',
	 *  tokenEndpointAuthMethod: 'client_secret_basic'
	 * })
	 * ```
	 */
	tokenEndpointAuthMethod?: oauth.ClientAuthenticationMethod
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
	 * The storage to use for persisting the refresh token.
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

export class OAuthClient {
	private _client: oauth.Client
	private _issuer: URL
	private _scope: string
	private _storage: Storage
	private _redirectUri: string
	private _postLogoutRedirectUri: string
	private _refreshToken: Ref<string | undefined | null> = ref()
	private _accessToken: Ref<string | undefined | null> = ref()
	private _codeVerifier: Ref<string | undefined | null> = ref()
	private _authorizationServer?: oauth.AuthorizationServer

	constructor(options: OAuthClientOptions) {
		this._issuer = new URL(options.url)
		this._client = {
			client_id: options.clientId,
			token_endpoint_auth_method:
				options.tokenEndpointAuthMethod ?? 'none',
		}
		this._scope =
			typeof options.scopes === 'string'
				? options.scopes
				: options.scopes?.join(' ') ?? ''
		this._storage = options.storage ?? new LocalStorage('oauth')
		this._refreshToken.value = this._storage.get('refresh_token')
		this._codeVerifier.value = this._storage.get('code_verifier')
		this._redirectUri = options.redirectUri ?? document.location.origin
		this._postLogoutRedirectUri =
			options.postLogoutRedirectUri ?? document.location.origin

		watch(this._refreshToken, (newValue) => {
			this._storage.set('refresh_token', newValue)
		})

		watch(this._codeVerifier, (newValue) => {
			this._storage.set('code_verifier', newValue)
		})
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
			this._refreshToken.value = undefined
			this._accessToken.value = undefined
			this._codeVerifier.value = undefined
		}
		if (options.clientId) {
			this._client.client_id = options.clientId
		}
		if (options.tokenEndpointAuthMethod) {
			this._client.token_endpoint_auth_method =
				options.tokenEndpointAuthMethod
		}
		if (options.scopes) {
			this._scope =
				typeof options.scopes === 'string'
					? options.scopes
					: options.scopes?.join(' ') ?? ''
		}
		if (options.storage) {
			this._storage = options.storage
			this._refreshToken.value = this._storage.get('refresh_token')
			this._accessToken.value = undefined
			this._codeVerifier.value = this._storage.get('code_verifier')
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
	public initialize = async () => {
		this._authorizationServer = await oauth
			.discoveryRequest(this._issuer)
			.then((response) =>
				oauth.processDiscoveryResponse(this._issuer, response),
			)
		if (this._refreshToken.value) {
			return await this.refreshToken()
		}
		if (this._codeVerifier.value) {
			const urlParams = new URLSearchParams(window.location.search)
			return await this.handleCodeResponse(urlParams)
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
		const codeChallenge = await oauth.calculatePKCECodeChallenge(
			this._codeVerifier.value,
		)
		const authorizationUrl = new URL(
			this._authorizationServer?.authorization_endpoint ??
				`${this._issuer.toString()}/oauth2/authorize`,
		)
		authorizationUrl.searchParams.set('client_id', this._client.client_id)
		authorizationUrl.searchParams.set('code_challenge', codeChallenge)
		authorizationUrl.searchParams.set('code_challenge_method', 'S256')
		authorizationUrl.searchParams.set('redirect_uri', this._redirectUri)
		authorizationUrl.searchParams.set('response_type', 'code')
		authorizationUrl.searchParams.set('scope', this._scope)
		document.location.replace(authorizationUrl.toString())
	}

	/**
	 * Handle the authorization code response.
	 * @throws If the client is not initialized.
	 * @param urlParams - The URL parameters.
	 */
	public handleCodeResponse = async (urlParams: URLSearchParams) => {
		if (!this._authorizationServer) {
			throw new Error('OAuthClient not initialized')
		}
		if (!this._codeVerifier.value) {
			return false
		}
		if (!urlParams.has('code')) {
			this._codeVerifier.value = undefined
			return false
		}
		const params = oauth.validateAuthResponse(
			this._authorizationServer,
			this._client,
			urlParams,
			oauth.expectNoState,
		)
		if (oauth.isOAuth2Error(params)) {
			this._codeVerifier.value = undefined
			throw new Error('OAuth 2.0 redirect error')
		}
		const response = await oauth.authorizationCodeGrantRequest(
			this._authorizationServer,
			this._client,
			params,
			this._redirectUri,
			this._codeVerifier.value,
		)
		if (oauth.parseWwwAuthenticateChallenges(response)) {
			this._codeVerifier.value = undefined
			throw new Error('www-authenticate challenges error')
		}
		const result = await oauth.processAuthorizationCodeOpenIDResponse(
			this._authorizationServer,
			this._client,
			response,
		)
		if (oauth.isOAuth2Error(result)) {
			this._codeVerifier.value = undefined
			throw new Error('OAuth 2.0 response body error')
		}
		this._codeVerifier.value = undefined
		this._accessToken.value = result.access_token
		this._refreshToken.value = result.refresh_token
		return this.accessToken
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
	public refreshToken = async () => {
		if (!this._authorizationServer) {
			throw new Error('OAuthClient not initialized')
		}
		if (!this._refreshToken.value) {
			return false
		}
		const response = await oauth.refreshTokenGrantRequest(
			this._authorizationServer,
			this._client,
			this._refreshToken.value,
		)
		const result = await oauth.processRefreshTokenResponse(
			this._authorizationServer,
			this._client,
			response,
		)
		if (oauth.isOAuth2Error(result)) {
			throw new Error('OAuth 2.0 response body error')
		}
		this._accessToken.value = result.access_token
		this._refreshToken.value = result.refresh_token
		return this.accessToken
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
		this._refreshToken.value = undefined
		if (this.loggedIn.value) {
			this._accessToken.value = undefined
			const logoutUrl = new URL(
				this._authorizationServer?.end_session_endpoint ??
					`${this._issuer.toString()}/oauth2/logout`,
			)
			logoutUrl.searchParams.set(
				'post_logout_redirect_uri',
				this._postLogoutRedirectUri,
			)
			if (logoutHint) {
				logoutUrl.searchParams.set('logout_hint', logoutHint)
			}
			document.location.replace(logoutUrl.toString())
		}
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
		return computed(() => !!this._accessToken.value)
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
		return readonly(this._accessToken)
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
