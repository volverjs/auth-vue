import path from 'node:path'
import ESLint from '@nabla/vite-plugin-eslint'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    return defineConfig({
        test: {
            globals: true,
            environment: 'happy-dom',
        },
        build: {
            lib: {
                name: '@volverjs/data',
                formats: ['es'],
                entry: {
                    index: path.resolve(import.meta.dirname, 'src/index.ts'),
                    LocalStorage: path.resolve(
                        import.meta.dirname,
                        'src/LocalStorage.ts',
                    ),
                    OAuthClient: path.resolve(
                        import.meta.dirname,
                        'src/OAuthClient.ts',
                    ),
                    SessionStorage: path.resolve(
                        import.meta.dirname,
                        'src/SessionStorage.ts',
                    ),
                    Storage: path.resolve(import.meta.dirname, 'src/Storage.ts'),
                },
                fileName: (format, entryName) => `${entryName}.js`,
            },
            rollupOptions: {
                external: ['vue', 'oauth4webapi'],
                output: {
                    exports: 'named',
                    globals: {
                        vue: 'Vue',
                        oauth4webapi: 'oauth',
                    },
                },
            },
        },
        plugins: [
            // https://github.com/gxmari007/vite-plugin-eslint
            // The ESLint worker keeps the process alive after vitest closes,
            // and linting already runs as a separate script.
            ...(mode === 'test' ? [] : [ESLint()]),

            // https://github.com/qmhc/unplugin-dts
            dts({
                compilerOptions: {
                    rootDir: path.resolve(import.meta.dirname, 'src'),
                },
            }),
        ],
    })
}
