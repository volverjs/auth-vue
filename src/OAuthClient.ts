import * as oauth from 'oauth4webapi'
import { computed, readonly, ref, watch, type Ref } from 'vue'
import type { Storage } from './Storage'
import { LocalStorage } from './LocalStorage'

export type OAuthClientOptions = {
	url: string
	clientId: string
	tokenEndpointAuthMethod?: oauth.ClientAuthenticationMethod
	scopes?: string[] | string
	storage?: Storage
	redirectUri?: string
	postLogoutRedirectUri?: string
}

export class OAuthClient {
	private _client: oauth.Client
	private _issuer: URL
	private _scope: string
	private _storage: Storage
	private _redirectUri: string
	private _postLogoutRedirectUri: string
	private _refreshToken: Ref<string | undefined | null>
	private _accessToken: Ref<string | undefined | null>
	private _authorizationServer?: oauth.AuthorizationServer
	private _codeVerifier: Ref<string | undefined | null>

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
		this._refreshToken = ref(this._storage.get('refresh_token'))
		this._accessToken = ref()
		this._codeVerifier = ref(this._storage.get('code_verifier'))
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

	public initialize = async () => {
		this._authorizationServer = await oauth
			.discoveryRequest(this._issuer)
			.then((response) =>
				oauth.processDiscoveryResponse(this._issuer, response),
			)
		console.log(this._authorizationServer)
		if (this._refreshToken.value) {
			return await this.refreshToken()
		}
		if (this._codeVerifier.value) {
			const urlParams = new URLSearchParams(window.location.search)
			return await this.handleCodeResponse(urlParams)
		}
		return Promise.resolve()
	}

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
		return this._accessToken
	}

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
		return this._accessToken
	}

	public logout = (logout_hint?: string) => {
		if (!this._authorizationServer) {
			throw new Error('OAuthClient not initialized')
		}
		if (!this.loggedIn.value) {
			throw new Error('OAuthClient not logged in')
		}
		this._refreshToken.value = undefined
		this._accessToken.value = undefined
		const logoutUrl = new URL(
			this._authorizationServer?.end_session_endpoint ??
				`${this._issuer.toString()}/oauth2/logout`,
		)
		logoutUrl.searchParams.set(
			'post_logout_redirect_uri',
			this._postLogoutRedirectUri,
		)
		if (logout_hint) {
			logoutUrl.searchParams.set('logout_hint', logout_hint)
		}
		document.location.replace(logoutUrl.toString())
	}

	public get loggedIn() {
		return computed(() => !!this._accessToken.value)
	}

	public get accessToken() {
		return readonly(this._accessToken)
	}

	public get initialized() {
		return !!this._authorizationServer
	}
}
