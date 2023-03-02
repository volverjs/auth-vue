import { LocalStorage } from '../src/LocalStorage'
import { SessionStorage } from '../src/SessionStorage'

describe('Storage', () => {
	it('Should create and read a local storage key value', () => {
		const storage = new LocalStorage('oauth')
		storage.set('test', 'value')
		expect(localStorage.getItem('oauth.test')).toBe('value')
		expect(storage.get('test')).toBe('value')
		expect(storage.has('test')).toBe(true)
	})

	it('Should create and replace a local storage key value', () => {
		const storage = new LocalStorage('oauth')
		storage.set('test', 'value')
		expect(localStorage.getItem('oauth.test')).toBe('value')
		storage.set('test', 'otherValue')
		expect(storage.get('test')).toBe('otherValue')
		expect(localStorage.getItem('oauth.test')).toBe('otherValue')
		expect(storage.has('test')).toBe(true)
	})

	it('Should create and read a session storage key value', () => {
		const storage = new SessionStorage('oauth')
		storage.set('test', 'value')
		expect(sessionStorage.getItem('oauth.test')).toBe('value')
		expect(storage.get('test')).toBe('value')
		expect(storage.has('test')).toBe(true)
	})

	it('Should create and replace a local storage key value', () => {
		const storage = new SessionStorage('oauth')
		storage.set('test', 'value')
		expect(sessionStorage.getItem('oauth.test')).toBe('value')
		storage.set('test', 'otherValue')
		expect(storage.get('test')).toBe('otherValue')
		expect(sessionStorage.getItem('oauth.test')).toBe('otherValue')
		expect(storage.has('test')).toBe(true)
	})
})
