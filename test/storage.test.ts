import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalStorage } from '../src/LocalStorage'
import { SessionStorage } from '../src/SessionStorage'

describe('storage', () => {
    it('should create and read a local storage key value', () => {
        const storage = new LocalStorage('oauth')
        storage.set('test', 'value')
        expect(localStorage.getItem('oauth.test')).toBe('value')
        expect(storage.get('test')).toBe('value')
        expect(storage.has('test')).toBe(true)
    })

    it('should create and replace a local storage key value', () => {
        const storage = new LocalStorage('oauth')
        storage.set('test', 'value')
        expect(localStorage.getItem('oauth.test')).toBe('value')
        storage.set('test', 'otherValue')
        expect(storage.get('test')).toBe('otherValue')
        expect(localStorage.getItem('oauth.test')).toBe('otherValue')
        expect(storage.has('test')).toBe(true)
    })

    it('should create and read a session storage key value', () => {
        const storage = new SessionStorage('oauth')
        storage.set('test', 'value')
        expect(sessionStorage.getItem('oauth.test')).toBe('value')
        expect(storage.get('test')).toBe('value')
        expect(storage.has('test')).toBe(true)
    })

    it('should create and replace a session storage key value', () => {
        const storage = new SessionStorage('oauth')
        storage.set('test', 'value')
        expect(sessionStorage.getItem('oauth.test')).toBe('value')
        storage.set('test', 'otherValue')
        expect(storage.get('test')).toBe('otherValue')
        expect(sessionStorage.getItem('oauth.test')).toBe('otherValue')
        expect(storage.has('test')).toBe(true)
    })

    it('should scope keys that contain the base key as a substring', () => {
        const storage = new LocalStorage('oauth')
        // 'oauth-extra' contains 'oauth' but is not already scoped: it must
        // still be prefixed, otherwise different instances would collide.
        storage.set('oauth-extra', 'value')
        expect(localStorage.getItem('oauth.oauth-extra')).toBe('value')
        expect(storage.get('oauth-extra')).toBe('value')
    })

    it('should clear only the keys scoped to the instance', () => {
        localStorage.clear()
        const storage = new LocalStorage('oauth')
        storage.set('a', '1')
        storage.set('b', '2')
        localStorage.setItem('other.key', 'keep')
        storage.clear()
        expect(storage.get('a')).toBeUndefined()
        expect(storage.get('b')).toBeUndefined()
        expect(localStorage.getItem('other.key')).toBe('keep')
    })

    it('should not wipe the whole storage when there is no base key', () => {
        localStorage.clear()
        localStorage.setItem('unrelated', 'keep')
        const storage = new LocalStorage()
        storage.clear()
        expect(localStorage.getItem('unrelated')).toBe('keep')
    })

    it('should delete a key when set with null or undefined', () => {
        const storage = new SessionStorage('oauth')
        storage.set('test', 'value')
        storage.set('test', null)
        expect(storage.has('test')).toBe(false)
    })

    describe('support detection', () => {
        afterEach(() => {
            vi.unstubAllGlobals()
        })

        it('should report local storage as supported by default', () => {
            expect(LocalStorage.supported()).toBe(true)
            expect(SessionStorage.supported()).toBe(true)
        })

        it('should throw when local storage is not supported', () => {
            vi.stubGlobal('localStorage', undefined)
            expect(LocalStorage.supported()).toBe(false)
            const storage = new LocalStorage('oauth')
            expect(() => storage.get('x')).toThrow(
                'Local storage is not supported',
            )
        })

        it('should throw when session storage is not supported', () => {
            vi.stubGlobal('sessionStorage', undefined)
            expect(SessionStorage.supported()).toBe(false)
            const storage = new SessionStorage('oauth')
            expect(() => storage.set('x', 'y')).toThrow(
                'Session storage is not supported',
            )
        })
    })
})
