import { getCurrentInstance, readonly, type App, type InjectionKey } from 'vue'
import { OAuthClient, type OAuthClientOptions } from './OAuthClient'

export { OAuthClient }
export { Storage } from './Storage'
export { LocalStorage } from './LocalStorage'
export { SessionStorage } from './SessionStorage'

export type AuthPluginOptions =
	| OAuthClientOptions
	| {
			instance: OAuthClient
	  }

export const useAuth = () => {
	const root = getCurrentInstance()
	if (!root) {
		throw new Error(
			'[auth-vue error]: useAuth must be called within a setup function.',
		)
	}
	const client = root.appContext.config.globalProperties
		.$vvAuth as OAuthClient
	if (!client) {
		throw new Error(
			'[auth-vue error]: useAuth must be called after plugin install.',
		)
	}
	const loggedIn = readonly(client.loggedIn)
	const accessToken = readonly(client.accessToken)
	const initialize = client.initialize
	const refreshToken = client.refreshToken
	const authorize = client.authorize
	const logout = client.logout

	return {
		loggedIn,
		accessToken,
		initialize,
		refreshToken,
		authorize,
		logout,
	}
}

export const authClientInjectionKey = Symbol() as InjectionKey<OAuthClient>

export default {
	install(app: App, options: AuthPluginOptions) {
		app.config.globalProperties.$vvAuth =
			('instance' in options ? options.instance : undefined) ??
			new OAuthClient(options as OAuthClientOptions)
		app.provide(authClientInjectionKey, app.config.globalProperties.$vvAuth)
	},
}
