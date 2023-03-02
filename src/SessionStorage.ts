import { Storage } from './Storage'

export class SessionStorage extends Storage {
	public get(name: string, defaultValue?: string) {
		return sessionStorage.getItem(this.key(name)) ?? defaultValue
	}

	public set(name: string, value?: string | null) {
		if (value === null || value === undefined) {
			this.delete(name)
			return
		}
		sessionStorage.setItem(this.key(name), value)
	}

	public delete(name: string) {
		sessionStorage.removeItem(this.key(name))
	}

	public clear() {
		const base = this.key()

		for (const key in sessionStorage) {
			if (key.indexOf(base) === 0) {
				this.delete(key)
			}
		}
	}

	public static supported() {
		return (
			typeof window !== 'undefined' &&
			typeof sessionStorage !== 'undefined'
		)
	}
}
