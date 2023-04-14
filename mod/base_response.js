/**@type {{url: string, method: string, headers: Object.<string, string>, id: string}} */
let $request = globalThis['$request'];
/**@type {{status: number, headers: Object.<string, string>, body: string | Uint8Array | undefined}} */
let $response = globalThis['$response'];
/**@type {(data: {status: number | undefined, headers: Object.<string, string> | undefined, body: string | Uint8Array | undefined} | undefined) => void} */
let $done = globalThis['$done'];

module.exports = { $request, $response, $done }
