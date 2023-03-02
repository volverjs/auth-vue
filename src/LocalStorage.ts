import { Storage } from './Storage'

export class LocalStorage extends Storage {
	public get(name: string, defaultValue?: string) {
		return localStorage.getItem(this.key(name)) ?? defaultValue
	}

	public set(name: string, value?: string | null) {
		if (value === null || value === undefined) {
			this.delete(name)
			return
		}
		localStorage.setItem(this.key(name), value)
	}

	public delete(name: string) {
		localStorage.removeItem(this.key(name))
	}

	public clear() {
		const base = this.key()

		for (const key in localStorage) {
			if (key.indexOf(base) === 0) {
				this.delete(key)
			}
		}
	}

	public static supported() {
		return (
			typeof window !== 'undefined' && typeof localStorage !== 'undefined'
		)
	}
}
