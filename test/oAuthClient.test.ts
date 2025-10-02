import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { OAuthClient } from '../src/OAuthClient'

const fetchMock = createFetchMock(vi)

const response = JSON.stringify({
    token_endpoint: 'http://dummy.com/oauth2/v2.0/token',
    token_endpoint_auth_methods_supported: [
        'client_secret_post',
        'private_key_jwt',
        'client_secret_basic',
    ],
    jwks_uri: 'http://dummy.com/discovery/v2.0/keys',
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
    issuer: 'http://dummy.com',
    request_uri_parameter_supported: false,
    userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
    authorization_endpoint: 'http://dummy.com/oauth2/v2.0/authorize',
    device_authorization_endpoint: 'http://dummy.com/oauth2/v2.0/devicecode',
    http_logout_supported: true,
    frontchannel_logout_supported: true,
    end_session_endpoint: 'http://dummy.com/oauth2/v2.0/logout',
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
    kerberos_endpoint: 'http://dummy.com/kerberos',
    tenant_region_scope: 'EU',
    cloud_instance_name: 'microsoftonline.com',
    cloud_graph_host_name: 'graph.windows.net',
    msgraph_host: 'graph.microsoft.com',
    rbac_url: 'https://pas.windows.net',
})

describe('oAuthClient', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
    })
    it('should create a new OAuthClient instance', () => {
        const client = new OAuthClient({
            clientId: '864b865f-3025-4c48-b4ed-c16676a5b676',
            url: 'http://dummy.com',
        })
        expect(client).toBeInstanceOf(OAuthClient)
    })

    it('should initialize', async () => {
        fetchMock.mockResponse(response, {
            status: 200,
            statusText: 'ok',
            url: 'http://dummy.com/.well-known/openid-configuration',
        })
        const client = new OAuthClient({
            clientId: 'test',
            scopes: ['test'],
            url: 'http://dummy.com',
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
            url: 'http://dummy.com/.well-known/openid-configuration',
        })
        const client = new OAuthClient({
            clientId: 'test',
            scopes: ['test'],
            url: 'http://dummy.com',
        })
        expect(client).toBeInstanceOf(OAuthClient)
        await client.initialize()
        expect(client.initialized).toBe(true)
        await client.authorize()
        const urlToTest = mockResponse.mock.calls[0][0]
        expect(urlToTest).toContain('http://dummy.com/oauth2/v2.0/authorize')
        expect(urlToTest).toContain('scope=test')
        expect(urlToTest).toContain('client_id=test')
    })
})
