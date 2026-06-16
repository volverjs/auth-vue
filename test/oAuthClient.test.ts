import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { LocalStorage } from '../src/LocalStorage'
import { OAuthClient } from '../src/OAuthClient'
import { SessionStorage } from '../src/SessionStorage'

const fetchMock = createFetchMock(vi)

const response = JSON.stringify({
    token_endpoint: 'https://dummy.com/oauth2/v2.0/token',
    token_endpoint_auth_methods_supported: [
        'client_secret_post',
        'private_key_jwt',
        'client_secret_basic',
    ],
    jwks_uri: 'https://dummy.com/discovery/v2.0/keys',
    response_modes_supported: ['query', 'fragment', 'form_post'],
    subject_types_supported: ['pairwise'],
    id_token_signing_alg_values_supported: ['RS256'],
    response_types_supported: [
        'code',
        'id_token',
        'code id_token',
        'id_token token',
    ],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    issuer: 'https://dummy.com',
    request_uri_parameter_supported: false,
    userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
    authorization_endpoint: 'https://dummy.com/oauth2/v2.0/authorize',
    device_authorization_endpoint: 'https://dummy.com/oauth2/v2.0/devicecode',
    http_logout_supported: true,
    frontchannel_logout_supported: true,
    end_session_endpoint: 'https://dummy.com/oauth2/v2.0/logout',
    claims_supported: [
        'sub',
        'iss',
        'cloud_instance_name',
        'cloud_instance_host_name',
        'cloud_graph_host_name',
        'msgraph_host',
        'aud',
        'exp',
        'iat',
        'auth_time',
        'acr',
        'nonce',
        'preferred_username',
        'name',
        'tid',
        'ver',
        'at_hash',
        'c_hash',
        'email',
    ],
    kerberos_endpoint: 'https://dummy.com/kerberos',
    tenant_region_scope: 'EU',
    cloud_instance_name: 'microsoftonline.com',
    cloud_graph_host_name: 'graph.windows.net',
    msgraph_host: 'graph.microsoft.com',
    rbac_url: 'https://pas.windows.net',
})

/**
 * Route fetch: the discovery URL returns the AS metadata, anything that looks
 * like the token endpoint returns the provided token response.
 */
function mockEndpoints({
    tokenBody = '{}',
    tokenStatus = 200,
}: { tokenBody?: string, tokenStatus?: number } = {}) {
    fetchMock.mockResponse((req) => {
        if (req.url.includes('/token')) {
            return { body: tokenBody, status: tokenStatus }
        }
        return { body: response, status: 200 }
    })
}

/**
 * Install a fake `document` with a spied `location.replace` and return the spy.
 */
function setupDocument() {
    const replace = vi.fn()
    globalThis.document = {
        // @ts-expect-error: Mocking window.location
        location: {
            assign: replace,
            replace,
            origin: 'https://my-app.com',
        },
    }
    return replace
}

describe('oAuthClient', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
        localStorage.clear()
        sessionStorage.clear()
    })
    it('should create a new OAuthClient instance', () => {
        const client = new OAuthClient({
            clientId: '864b865f-3025-4c48-b4ed-c16676a5b676',
            url: 'https://dummy.com',
        })
        expect(client).toBeInstanceOf(OAuthClient)
    })

    it('should initialize', async () => {
        fetchMock.mockResponse(response, {
            status: 200,
            statusText: 'ok',
            url: 'https://dummy.com/.well-known/openid-configuration',
        })
        const client = new OAuthClient({
            clientId: 'test',
            scopes: ['test'],
            url: 'https://dummy.com',
        })
        expect(client).toBeInstanceOf(OAuthClient)
        await client.initialize()
        expect(client.initialized).toBe(true)
    })
    it('should authorize', async () => {
        const mockResponse = vi.fn()
        globalThis.document = {
            // @ts-expect-error: Mocking window.location
            location: {
                assign: mockResponse,
                replace: mockResponse,
            },
        }
        fetchMock.mockResponse(response, {
            status: 200,
            statusText: 'ok',
            url: 'https://dummy.com/.well-known/openid-configuration',
        })
        const client = new OAuthClient({
            clientId: 'test',
            scopes: ['test'],
            url: 'https://dummy.com',
        })
        expect(client).toBeInstanceOf(OAuthClient)
        await client.initialize()
        expect(client.initialized).toBe(true)
        await client.authorize()
        const urlToTest = mockResponse.mock.calls[0][0]
        expect(urlToTest).toContain('https://dummy.com/oauth2/v2.0/authorize')
        expect(urlToTest).toContain('scope=test')
        expect(urlToTest).toContain('client_id=test')
        // CSRF protection (state) and PKCE must always be present.
        expect(urlToTest).toContain('state=')
        expect(urlToTest).toContain('code_challenge=')
        expect(urlToTest).toContain('code_challenge_method=S256')
        // Without the `openid` scope no nonce should be requested.
        expect(urlToTest).not.toContain('nonce=')
    })

    it('should request a nonce only when the openid scope is used', async () => {
        const replace = setupDocument()
        mockEndpoints()
        const client = new OAuthClient({
            clientId: 'test',
            scopes: ['openid', 'profile'],
            url: 'https://dummy.com',
        })
        await client.initialize()
        await client.authorize()
        const url = replace.mock.calls.at(-1)![0] as string
        expect(url).toContain('nonce=')
        expect(localStorage.getItem('oauth.nonce')).toBeTruthy()
    })

    it('should persist code verifier, state and nonce on authorize', async () => {
        const mockResponse = vi.fn()
        globalThis.document = {
            // @ts-expect-error: Mocking window.location
            location: {
                assign: mockResponse,
                replace: mockResponse,
                origin: 'https://my-app.com',
            },
        }
        fetchMock.mockResponse(response, {
            status: 200,
            statusText: 'ok',
            url: 'https://dummy.com/.well-known/openid-configuration',
        })
        sessionStorage.clear()
        localStorage.clear()
        const client = new OAuthClient({
            clientId: 'test',
            scopes: ['openid', 'profile'],
            url: 'https://dummy.com',
            storageType: 'session',
        })
        await client.initialize()
        await client.authorize()
        // With storageType 'session' the transient values must live in
        // sessionStorage, scoped under the default 'oauth' base key.
        expect(sessionStorage.getItem('oauth.code_verifier')).toBeTruthy()
        expect(sessionStorage.getItem('oauth.state')).toBeTruthy()
        expect(sessionStorage.getItem('oauth.nonce')).toBeTruthy()
        expect(localStorage.getItem('oauth.code_verifier')).toBeNull()
    })

    it('should join array scopes with spaces in the authorize URL', async () => {
        const replace = setupDocument()
        mockEndpoints()
        const client = new OAuthClient({
            clientId: 'test',
            scopes: ['openid', 'profile', 'email'],
            url: 'https://dummy.com',
        })
        await client.initialize()
        await client.authorize()
        // URLSearchParams encodes spaces as '+'.
        const url = replace.mock.calls.at(-1)![0] as string
        expect(url).toContain('scope=openid+profile+email')
    })

    it('should expose stable reactive references', () => {
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        expect(client.loggedIn).toBe(client.loggedIn)
        expect(client.accessToken).toBe(client.accessToken)
    })

    it('should not throw when document is unavailable (SSR)', () => {
        const saved = globalThis.document
        // @ts-expect-error: simulate a server-side environment
        delete globalThis.document
        expect(
            () =>
                new OAuthClient({ clientId: 'test', url: 'https://dummy.com' }),
        ).not.toThrow()
        globalThis.document = saved
    })

    it('should throw when methods are called before initialize', async () => {
        setupDocument()
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await expect(client.authorize()).rejects.toThrow(
            'OAuthClient not initialized',
        )
        await expect(
            client.handleCodeResponse(new URLSearchParams()),
        ).rejects.toThrow('OAuthClient not initialized')
        await expect(client.refreshToken()).rejects.toThrow(
            'OAuthClient not initialized',
        )
        expect(() => client.logout()).toThrow('OAuthClient not initialized')
    })

    it('should set the access token from initialize options', async () => {
        setupDocument()
        mockEndpoints()
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize({ accessToken: 'preset-token' })
        expect(client.accessToken.value).toBe('preset-token')
        expect(client.loggedIn.value).toBe(true)
    })

    it('should refresh the token on initialize when a refresh token exists', async () => {
        setupDocument()
        mockEndpoints({
            tokenBody: JSON.stringify({
                access_token: 'new-access',
                token_type: 'bearer',
                refresh_token: 'new-refresh',
            }),
        })
        new LocalStorage('oauth').set('refresh_token', 'old-refresh')
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize()
        expect(client.accessToken.value).toBe('new-access')
        expect(client.loggedIn.value).toBe(true)
        expect(localStorage.getItem('oauth.refresh_token')).toBe('new-refresh')
    })

    it('should clear the refresh token when the refresh fails', async () => {
        setupDocument()
        mockEndpoints({
            tokenBody: JSON.stringify({ error: 'invalid_grant' }),
            tokenStatus: 400,
        })
        new LocalStorage('oauth').set('refresh_token', 'expired')
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await expect(client.initialize()).rejects.toThrow()
        expect(localStorage.getItem('oauth.refresh_token')).toBeNull()
        expect(client.loggedIn.value).toBe(false)
    })

    it('should handle the authorization code response and clear transient values', async () => {
        setupDocument()
        mockEndpoints({
            tokenBody: JSON.stringify({
                access_token: 'acc',
                token_type: 'bearer',
                refresh_token: 'ref',
            }),
        })
        // No `openid` scope: the token response has no id_token, so this
        // exercises the plain OAuth 2.0 path without JWT validation.
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize()
        await client.authorize()
        const state = localStorage.getItem('oauth.state') as string
        const params = new URLSearchParams({ code: 'the-code', state })
        await client.handleCodeResponse(params)
        expect(client.accessToken.value).toBe('acc')
        expect(localStorage.getItem('oauth.refresh_token')).toBe('ref')
        expect(localStorage.getItem('oauth.code_verifier')).toBeNull()
        expect(localStorage.getItem('oauth.state')).toBeNull()
        expect(localStorage.getItem('oauth.nonce')).toBeNull()
    })

    it('should reject a mismatched state (CSRF protection)', async () => {
        setupDocument()
        mockEndpoints({
            tokenBody: JSON.stringify({
                access_token: 'acc',
                token_type: 'bearer',
            }),
        })
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize()
        await client.authorize()
        const params = new URLSearchParams({ code: 'the-code', state: 'WRONG' })
        await expect(client.handleCodeResponse(params)).rejects.toThrow()
        // Transient values must be cleared even on failure.
        expect(localStorage.getItem('oauth.code_verifier')).toBeNull()
        expect(localStorage.getItem('oauth.state')).toBeNull()
        expect(localStorage.getItem('oauth.nonce')).toBeNull()
        expect(client.loggedIn.value).toBe(false)
    })

    it('should return false from handleCodeResponse when no code is present', async () => {
        setupDocument()
        mockEndpoints()
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize()
        await client.authorize()
        const result = await client.handleCodeResponse(
            new URLSearchParams({ state: 'whatever' }),
        )
        expect(result).toBe(false)
        expect(localStorage.getItem('oauth.code_verifier')).toBeNull()
    })

    it('should return false from handleCodeResponse without a code verifier', async () => {
        setupDocument()
        mockEndpoints()
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize()
        const result = await client.handleCodeResponse(
            new URLSearchParams({ code: 'x' }),
        )
        expect(result).toBe(false)
    })

    it('should logout, redirect and clear the session when logged in', async () => {
        const replace = setupDocument()
        mockEndpoints({
            tokenBody: JSON.stringify({
                access_token: 'acc',
                token_type: 'bearer',
                refresh_token: 'ref',
            }),
        })
        new LocalStorage('oauth').set('refresh_token', 'r')
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
            postLogoutRedirectUri: 'https://my-app.com',
        })
        await client.initialize()
        expect(client.loggedIn.value).toBe(true)
        client.logout('user@example.com')
        const url = decodeURIComponent(replace.mock.calls.at(-1)![0] as string)
        expect(url).toContain('https://dummy.com/oauth2/v2.0/logout')
        expect(url).toContain('post_logout_redirect_uri=https://my-app.com')
        expect(url).toContain('logout_hint=user@example.com')
        expect(localStorage.getItem('oauth.refresh_token')).toBeNull()
        expect(client.loggedIn.value).toBe(false)
    })

    it('should not redirect on logout when not logged in', async () => {
        const replace = setupDocument()
        mockEndpoints()
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize()
        client.logout()
        expect(replace).not.toHaveBeenCalled()
    })

    it('should reset tokens when extend changes the url', async () => {
        setupDocument()
        new LocalStorage('oauth').set('refresh_token', 'r')
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        client.extend({ clientId: 'test', url: 'https://other.com' })
        expect(localStorage.getItem('oauth.refresh_token')).toBeNull()
    })

    it('should reload values from the new storage when extend changes storageType', () => {
        setupDocument()
        new SessionStorage('oauth').set('refresh_token', 'from-session')
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        client.extend({
            clientId: 'test',
            url: 'https://dummy.com',
            storageType: 'session',
        })
        expect(client.loggedIn.value).toBe(false)
        // The refresh token is now read from sessionStorage.
        expect(sessionStorage.getItem('oauth.refresh_token')).toBe('from-session')
    })

    it('should handle a code in the URL before refreshing on initialize', async () => {
        setupDocument()
        // Distinguish the two grant types by the access token they return.
        fetchMock.mockResponse(async (req) => {
            if (req.url.includes('/token')) {
                const body = await req.text()
                const token = body.includes('grant_type=authorization_code')
                    ? 'from-code'
                    : 'from-refresh'
                return {
                    body: JSON.stringify({
                        access_token: token,
                        token_type: 'bearer',
                    }),
                    status: 200,
                }
            }
            return { body: response, status: 200 }
        })
        const storage = new LocalStorage('oauth')
        storage.set('refresh_token', 'stale-refresh')
        storage.set('code_verifier', 'a'.repeat(43))
        storage.set('state', 'my-state')
        window.history.replaceState(null, '', '/?code=the-code&state=my-state')
        const client = new OAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        await client.initialize()
        window.history.replaceState(null, '', '/')
        // The authorization code flow must win over the stale refresh token.
        expect(client.accessToken.value).toBe('from-code')
        expect(localStorage.getItem('oauth.code_verifier')).toBeNull()
    })
})
