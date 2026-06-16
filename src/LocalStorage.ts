import { Storage } from './Storage'

export class LocalStorage extends Storage {
    /**
     * Get a value from the local storage.
     * @param key - The storage key.
     * @param defaultValue - The default value to return if the key is not found.
     * @returns the value from the local storage.
     * @throws if the local storage is not supported.
     * @example
     * ```typescript
     * const storage = new LocalStorage('oauth')
     * storage.set('test', 'value')
     * expect(storage.get('test')).toBe('value')
     * ```
     */
    public get(key: string, defaultValue?: string) {
        this._checkSupport()
        return globalThis.localStorage.getItem(this.key(key)) ?? defaultValue
    }

    /**
     * Set a value in the local storage.
     * @param key - The storage key.
     * @param value - The value to store.
     * @throws if the local storage is not supported.
     * @example
     * ```typescript
     * const storage = new LocalStorage('oauth')
     * storage.set('test', 'value')
     * expect(storage.get('test')).toBe('value')
     * ```
     */
    public set(key: string, value?: string | null) {
        this._checkSupport()
        if (value === null || value === undefined) {
            this.delete(key)
            return
        }
        globalThis.localStorage.setItem(this.key(key), value)
    }

    /**
     * Delete a value from the local storage.
     * @param name - The storage key.
     * @throws if the local storage is not supported.
     * @example
     * ```typescript
     * const storage = new LocalStorage('oauth')
     * storage.set('test', 'value')
     * expect(storage.get('test')).toBe('value')
     * storage.delete('test')
     * expect(storage.get('test')).toBeUndefined()
     * ```
     */
    public delete(name: string) {
        this._checkSupport()
        globalThis.localStorage.removeItem(this.key(name))
    }

    /**
     * Clear all values from the local storage.
     * @throws if the local storage is not supported.
     * @example
     * ```typescript
     * const storage = new LocalStorage('oauth')
     * storage.set('test', 'value')
     * expect(storage.get('test')).toBe('value')
     * storage.clear()
     * expect(storage.get('test')).toBeUndefined()
     * ```
     */
    public clear() {
        this._checkSupport()
        // Without a base key there is no scope to limit the deletion to, so we
        // refuse to wipe the entire storage (which may belong to other code).
        if (!this.baseKey) {
            return
        }
        const base = this.key()
        const keys = Object.keys(globalThis.localStorage).filter(key =>
            key.startsWith(base),
        )
        for (const key of keys) {
            globalThis.localStorage.removeItem(key)
        }
    }

    /**
     * Check if the local storage is supported.
     * @returns true if the local storage is supported.
     * @example
     * ```typescript
     * expect(LocalStorage.supported()).toBe(true)
     * ```
     */
    public static supported() {
        return (
            typeof globalThis.window !== 'undefined'
            && typeof globalThis.localStorage !== 'undefined'
        )
    }

    private _checkSupport() {
        if (!LocalStorage.supported()) {
            throw new Error('Local storage is not supported')
        }
    }
}
