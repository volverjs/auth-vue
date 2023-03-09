import { JSDOM } from 'jsdom'
import { Headers } from 'node-fetch'
import crypto from 'crypto'

global.Headers = Headers

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
	url: 'http://localhost:3000',
})

global.dom = dom
global.window = dom.window
global.document = dom.window.document
global.navigator = global.window.navigator
global.crypto = {
    getRandomValues: (arr) => crypto.randomBytes(arr.length),
    subtle: {
        digest: () => {
            return Promise.resolve(new ArrayBuffer(0))
        },
    },
}
