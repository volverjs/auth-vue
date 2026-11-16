// An ES module consumer of the built package, type-checked by `package.test.ts` with the
// strictest resolution a consumer can pick (`nodenext`) and with `skipLibCheck` off, so
// an error inside our declarations fails the check instead of degrading the types to
// `any`. It imports the root entry and every subpath entry.
// The plain lines fail when a type is lost: a class whose base does not resolve loses
// every inherited member. Each `@ts-expect-error` guards the other way a type breaks: if
// it degrades to `any`, the expected error disappears and the directive fails.
import { createOAuthClient, OAuthClient, useOAuthClient } from '@volverjs/auth-vue'
import { LocalStorage } from '@volverjs/auth-vue/local-storage'
import { OAuthClient as OAuthClientEntry } from '@volverjs/auth-vue/oauth-client'
import { SessionStorage } from '@volverjs/auth-vue/session-storage'
import { Storage } from '@volverjs/auth-vue/storage'

// `OAuthClientPlugin` inherits `initialize()` from `OAuthClient` (#66).
const auth = createOAuthClient({
    url: 'https://example.com',
    clientId: 'my-client-id',
})
void auth.initialize()

// @ts-expect-error the options are an object
export const invalidClient = new OAuthClient('invalid')

// @ts-expect-error the client is not a number
export const badClient: number = useOAuthClient()

// @ts-expect-error a storage is not a number
export const badStorage = new OAuthClientEntry({ url: 'https://example.com', clientId: 'my-client-id', storage: 123 })

// The constructor and `has()` come from the `Storage` base class.
export const hasLocal: boolean = new LocalStorage('app').has('key')
export const hasSession: boolean = new SessionStorage('app').has('key')

// @ts-expect-error the key is a string
export const badLocal = new LocalStorage('app').has(123)

// @ts-expect-error the key is a string
export const badSession = new SessionStorage('app').has(123)

// @ts-expect-error the base class is abstract
export const badBase = new Storage('app')
