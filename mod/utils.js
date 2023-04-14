/**
 * @param {Object.<string, string>} headers
 * @param {string} key
 * @param {string | undefined} default_value
 */
function headers_get(headers, key, default_value = undefined) {
    let lkey = key.toLowerCase();
    let keys = Object.getOwnPropertyNames(headers);
    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        let l = k.toLowerCase();
        if (l == lkey) {
            return headers[l];
        }
    }
    return default_value;
}

/**
 * @param { string } value
 */
function get_charset(value) {
    let s = value.split(';');
    for (let i of s) {
        let j = i.trim().split('=')
        if (j.length > 1 && j[0] == 'charset') return j[1];
    }
}

module.exports = { headers_get, get_charset }
