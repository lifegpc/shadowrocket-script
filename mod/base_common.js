let $network = globalThis['$network'];
/**@type {{name: string, startTime: Date, type: string}} */
let $script = globalThis['$script'];
/**@type {{system: string, "surge-build": string, "surge-version": string, language: string}} */
let $environment = globalThis['$environment'];
/**@type {{write: (data: string, key: string | undefined) => boolean, read: (key: string | undefined) => string | null}} */
let $persistentStore = globalThis['$persistentStore'];
/**@type {{post: (url: string | {url: string, headers: Object.<string, string> | undefined, body: string | undefined}, callback: (error, response: {status: number, headers: Object.<string, string>}, data: string | Uint8Array) => void) => void, get: (url: string | {url: string, headers: Object.<string, string> | undefined, body: string | undefined}, callback: (error, response: {status: number, headers: Object.<string, string>}, data: string | Uint8Array) => void) => void, put: (url: string | {url: string, headers: Object.<string, string> | undefined, body: string | undefined}, callback: (error, response: {status: number, headers: Object.<string, string>}, data: string | Uint8Array) => void) => void, delete: (url: string | {url: string, headers: Object.<string, string> | undefined, body: string | undefined}, callback: (error, response: {status: number, headers: Object.<string, string>}, data: string | Uint8Array) => void) => void, head: (url: string | {url: string, headers: Object.<string, string> | undefined, body: string | undefined}, callback: (error, response: {status: number, headers: Object.<string, string>}, data: string | Uint8Array) => void) => void, options: (url: string | {url: string, headers: Object.<string, string> | undefined, body: string | undefined}, callback: (error, response: {status: number, headers: Object.<string, string>}, data: string | Uint8Array) => void) => void, patch: (url: string | {url: string, headers: Object.<string, string> | undefined, body: string | undefined}, callback: (error, response: {status: number, headers: Object.<string, string>}, data: string | Uint8Array) => void) => void}}*/
let $httpClient = globalThis['$httpClient'];
/**@type {{post: (title: string, subtitle: string, body: string) => void}} */
let $notification = globalThis['$notification'];
/**@type {{geoip: (ip: string) => string, ipasn: (ip: string) => string, ipaso: (ip: string) => string, ungzip: (binary: Uint8Array) => Uint8Array}} */
let $utils = globalThis['$utils'];
/**@type {string}*/
let $argument = globalThis['$argument'];

module.exports = { $network, $script, $environment, $persistentStore, $httpClient, $notification, $utils, $argument }
