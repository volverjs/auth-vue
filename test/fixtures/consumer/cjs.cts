// `esm.ts` written as CommonJS, type-checked by `package.test.ts` with `nodenext`. The
// package ships ES modules only: `nodenext` models Node's require(esm) and accepts these
// imports, `node16` models Node 16 and rejects them (TS1471). TypeScript picks the
// `types` condition either way, so `require.cjs` is what checks that `require()`
// resolves at runtime.
/* eslint-disable ts/no-require-imports -- the CommonJS form is what this file checks */
import auth = require('@volverjs/auth-vue')
import localStorage = require('@volverjs/auth-vue/local-storage')

const client = auth.createOAuthClient({
    url: 'https://example.com',
    clientId: 'my-client-id',
})
void client.initialize()

// @ts-expect-error the options are an object
export const invalidClient = new auth.OAuthClient('invalid')

// The constructor and `has()` come from the `Storage` base class.
export const hasLocal: boolean = new localStorage.LocalStorage('app').has('key')

// @ts-expect-error the key is a string
export const badLocal = new localStorage.LocalStorage('app').has(123)
