// A CommonJS consumer of the built package, run with Node by `package.test.ts`. The
// package ships ES modules only: `require()` loads them through Node's require(esm),
// available from Node 20.19 and 22.12, once the `default` condition of `exports` lets
// it resolve them. Prints the export names of every entry.
const process = require('node:process')

const entries = [
    '@volverjs/auth-vue',
    '@volverjs/auth-vue/storage',
    '@volverjs/auth-vue/local-storage',
    '@volverjs/auth-vue/session-storage',
    '@volverjs/auth-vue/oauth-client',
]

process.stdout.write(JSON.stringify(Object.fromEntries(
    entries.map(entry => [
        entry,
        Object.keys(require(entry)).sort(),
    ]),
)))
