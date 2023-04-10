/**@type {{url: string, method: string, headers: Object.<string, string>, body: string | Uint8Array | undefined, id: string}} */
let $request = globalThis['$request'];
/**@type {(data: {url: string | undefined, headers: Object.<string, string> | undefined, body: string | Uint8Array | undefined, response: {status: number | undefined, headers: Object.<string, string> | undefined, body: string | Uint8Array | undefined} | undefined} | undefined) => void} */
let $done = globalThis['$done'];

module.exports = { $request, $done };
