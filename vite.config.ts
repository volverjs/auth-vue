import path from 'node:path'
import ESLint from '@nabla/vite-plugin-eslint'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default () => {
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
                    index: path.resolve(__dirname, 'src/index.ts'),
                    LocalStorage: path.resolve(
                        __dirname,
                        'src/LocalStorage.ts',
                    ),
                    OAuthClient: path.resolve(__dirname, 'src/OAuthClient.ts'),
                    SessionStorage: path.resolve(
                        __dirname,
                        'src/SessionStorage.ts',
                    ),
                    Storage: path.resolve(__dirname, 'src/Storage.ts'),
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
            ESLint(),

            // https://github.com/qmhc/vite-plugin-dts
            dts({
                insertTypesEntry: true,
            }),
        ],
    })
}
