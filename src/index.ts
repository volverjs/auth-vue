import { getCurrentInstance, inject, type App, type InjectionKey } from 'vue'
import { OAuthClient, type OAuthClientOptions } from './OAuthClient'
export { OAuthClient }
export { Storage } from './Storage'
export { LocalStorage } from './LocalStorage'
export { SessionStorage } from './SessionStorage'

export const authClientInjectionKey = Symbol() as InjectionKey<OAuthClient>

export class OAuthClientPlugin extends OAuthClient {
	public install(app: App, { global = false } = {}) {
		if (global) {
			app.config.globalProperties.$vvAuth = this
		}
		app.provide(authClientInjectionKey, this)
	}
}

/**
 * Create a new OAuthClient instance.
 * @param options - The OAuthClient options, see {@link OAuthClientOptions}.
 * @returns {@link OAuthClient} instance.
 * @example
 * ```typescript
 * import { createOAuthClient } from '@volverjs/auth-vue'
 * import { createApp } from 'vue'
 * import App from './App.vue'
 *
 * const app = createApp(App)
 * const authClient = createOAuthClient({
 * 	url: 'https://example.com',
 * 	clientId: 'my-client-id',
 * })
 *
 * app.use(authClient, { global: true })
 * ```
 */
export const createOAuthClient = (options: OAuthClientOptions) =>
	new OAuthClientPlugin(options)

/**
 * Use the composition API to get the OAuthClient instance.
 * @param options - The OAuthClient options, see {@link OAuthClientOptions}.
 * @returns {@link OAuthClient} instance.
 * @remarks This function must be called in the `setup` function of a component.
 * @throws if the OAuthClient is not installed.
 * @throws if the function is not called in the `setup` function.
 *
 * @example
 * ```html
 * <template>
 *  <button @click="authorize">Login</button>
 * </template>
 *
 * <script setup>
 * 	import { useOAuthClient } from '@volverjs/auth-vue'
 * 	const authClient = useOAuthClient()
 * 	const authorize = () => authClient.authorize()
 * </script>
 * ```
 */
export const useOAuthClient = (options?: OAuthClientOptions) => {
	const client = inject(authClientInjectionKey)
	const instance = getCurrentInstance()
	if (!instance) {
		throw new Error('useOAuthClient must be called in the setup function')
	}
	if (!client) {
		throw new Error('OAuthClient is not installed')
	}
	if (options) {
		client.extend(options)
	}
	return client
}
