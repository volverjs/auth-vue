// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Checks the package as consumers install it, not as this repository compiles it: the
 * declarations once shipped extensionless relative imports (#66), which break every type
 * behind them under `moduleResolution: "node16"` or `"nodenext"`, and `require()` found no
 * `exports` condition to resolve. That did not show up here, because `src/` compiles with
 * `moduleResolution: "bundler"` and `skipLibCheck: true`, and the other tests import `src/`.
 *
 * `pnpm test` builds before running, and CI builds before `pnpm test-vitest`, so this
 * reads the freshly built output; `pnpm test-vitest` alone reads whatever `dist` holds.
 * `dist` is not committed, so locally, when it is absent, there is nothing to check
 * rather than something to fail.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const built = existsSync(resolve(root, 'dist'))

// The consumer has its own package.json: inside this package's scope, Node's
// self-reference would resolve `@volverjs/auth-vue` to `../../../dist` instead of the
// copy installed below.
const consumer = resolve(root, 'test/fixtures/consumer')

/**
 * The `exports` entries that carry conditions, as `[subpath, conditions]`. `./src/*` and
 * `./dist/*` map straight to the folders and are left out.
 */
const conditionalExports = Object.entries(pkg.exports as Record<string, string | Record<string, string>>)
    .filter((entry): entry is [string, Record<string, string>] => typeof entry[1] !== 'string')

/** Runs `tsc` on a consumer project and returns the diagnostics that concern us. */
function typeCheck(project: string): string[] {
    const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
    const result = spawnSync(process.execPath, [
        tsc,
        '-p',
        project,
        '--pretty',
        'false',
    ], {
        cwd: consumer,
        encoding: 'utf8',
    })
    // Only diagnostics in the consumer and in our copy count: third-party declarations
    // resolve from outside the consumer (`../`). Indented lines continue the diagnostic
    // above them. `tsc` prints diagnostics on stdout, so anything on stderr is a crash,
    // reported in full rather than passing as an empty list.
    return [
        ...result.stdout.split('\n').filter(line => /^\S/.test(line) && !line.startsWith('..')),
        ...result.stderr.split('\n').filter(Boolean),
    ]
}

// Locally a missing `dist` skips the suite; CI builds first, so there it must fail.
describe.skipIf(!built && !process.env.CI)('published package', () => {
    beforeAll(() => {
        const installed = resolve(consumer, 'node_modules/@volverjs/auth-vue')
        rmSync(installed, { recursive: true, force: true })
        mkdirSync(installed, { recursive: true })
        cpSync(resolve(root, 'package.json'), resolve(installed, 'package.json'))
        cpSync(resolve(root, 'dist'), resolve(installed, 'dist'), { recursive: true })
    })

    afterAll(() => {
        rmSync(resolve(consumer, 'node_modules'), { recursive: true, force: true })
    })

    it('points every entry at a file the build emits', () => {
        const entries = [
            pkg.main,
            pkg.module,
            pkg.types,
            ...conditionalExports.flatMap(([, conditions]) => Object.values(conditions)),
        ]
        for (const entry of entries) {
            expect(existsSync(resolve(root, entry)), entry).toBe(true)
        }
    })

    it('adds .js to every relative import of the declarations', () => {
        // Statements start a line, which leaves out the JSDoc examples (` * import App
        // from './App.vue'`); `import()` types can sit anywhere in a line.
        const pattern = /(?:^(?:import|export)\s[^'"]*from\s*|import\(\s*)['"](\.\.?\/[^'"]+)['"]/gm
        const specifiers = readdirSync(resolve(root, 'dist'))
            .filter(file => file.endsWith('.d.ts'))
            .flatMap(file => [
                ...readFileSync(resolve(root, 'dist', file), 'utf8').matchAll(pattern),
            ]
                .map(match => `${file}: ${match[1]}`))
        expect(specifiers.length).toBeGreaterThan(0)
        expect(specifiers.filter(specifier => !specifier.endsWith('.js'))).toEqual([])
    })

    it('type-checks for an ES module consumer (nodenext)', () => {
        expect(typeCheck('tsconfig.esm.json')).toEqual([])
    }, 60_000)

    it('type-checks for a CommonJS consumer (nodenext)', () => {
        expect(typeCheck('tsconfig.cjs.json')).toEqual([])
    }, 60_000)

    it('returns the exports from require()', async () => {
        const expected: Record<string, string[]> = {}
        for (const [subpath, conditions] of conditionalExports) {
            // `require()` resolves `default`: it must be the ES module `import` gets.
            expect(conditions.default, subpath).toBe(conditions.import)
            // `./dist/Storage.js` is built from `src/Storage.ts`.
            const source = await import(resolve(root, 'src', `${basename(conditions.import, '.js')}.ts`))
            expected[`${pkg.name}${subpath.slice(1)}`] = Object.keys(source).sort()
        }
        const output = execFileSync(process.execPath, ['require.cjs'], { cwd: consumer, encoding: 'utf8' })
        expect(JSON.parse(output)).toEqual(expected)
    })

    it('passes arethetypeswrong under every module resolution', () => {
        // Packs the package and checks how TypeScript resolves every entry under node10,
        // node16 (from CommonJS and from ES modules) and bundler. Against 1.0.1 it reports
        // an internal resolution error for the root, `local-storage`, `session-storage`
        // and `oauth-client` (#66). The package ships ES modules only, which `require()`
        // loads from Node 20.19 and 22.12 on: the tool models Node 16 there and reports it
        // as a problem, so that one rule is off.
        const manifest = createRequire(import.meta.url).resolve('@arethetypeswrong/cli/package.json')
        const attw = resolve(dirname(manifest), JSON.parse(readFileSync(manifest, 'utf8')).bin.attw)
        const result = spawnSync(process.execPath, [
            attw,
            '--pack',
            '.',
            '--ignore-rules',
            'cjs-resolves-to-esm',
            '--format',
            'ascii',
            '--no-color',
        ], {
            cwd: root,
            encoding: 'utf8',
        })
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    }, 60_000)
})
