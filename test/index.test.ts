import type { App } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
    createOAuthClient,
    OAuthClient,
    OAuthClientPlugin,
    useOAuthClient,
} from '../src/index'

describe('plugin', () => {
    it('createOAuthClient returns an OAuthClient instance', () => {
        const client = createOAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        expect(client).toBeInstanceOf(OAuthClientPlugin)
        expect(client).toBeInstanceOf(OAuthClient)
    })

    it('install provides the client and exposes $vvAuth when global', () => {
        const client = createOAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        const provide = vi.fn()
        const app = {
            config: { globalProperties: {} as Record<string, unknown> },
            provide,
        } as unknown as App
        client.install(app, { global: true })
        expect(app.config.globalProperties.$vvAuth).toBe(client)
        expect(provide).toHaveBeenCalledWith(expect.anything(), client)
    })

    it('install does not set $vvAuth when not global', () => {
        const client = createOAuthClient({
            clientId: 'test',
            url: 'https://dummy.com',
        })
        const app = {
            config: { globalProperties: {} as Record<string, unknown> },
            provide: vi.fn(),
        } as unknown as App
        client.install(app)
        expect(app.config.globalProperties.$vvAuth).toBeUndefined()
    })
})

describe('composable', () => {
    it('useOAuthClient throws outside of a setup function', () => {
        expect(() => useOAuthClient()).toThrow(
            'useOAuthClient must be called in the setup function',
        )
    })
})
