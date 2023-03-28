export abstract class Storage {
	protected baseKey: string

	/**
	 * Creates a new storage instance.
	 * @param baseKey - The base key for storage.
	 */
	constructor(baseKey = '') {
		this.baseKey = baseKey
	}

	/**
	 * Determines if the current browser supports this storage type.
	 * @returns true if the storage type is supported.
	 */
	public static supported() {
		return true
	}

	/**
	 * Returns true if the storage has a value for the given key.
	 * @param name - The storage key.
	 * @returns true if the storage has a value for the given key.
	 */
	public has(name: string): boolean {
		return this.get(name) !== null && this.get(name) !== undefined
	}

	/**
	 * Returns a scoped key for storage.
	 * @param key - The storage key.
	 * @returns the scoped key for storage.
	 */
	protected key(key = ''): string {
		if (this.baseKey && key.indexOf(this.baseKey) === -1) {
			return `${this.baseKey}.${key}`
		}

		return key
	}
}

export interface Storage {
	get(name: string, defaultValue?: string): string | null | undefined
	set(name: string, value: unknown): void
	delete(name: string): void
	clear(): void
}
