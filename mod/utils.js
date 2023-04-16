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
            return headers[k];
        }
    }
    return default_value;
}

/**
 * 
 * @param {Object.<string, string>} headers 
 * @param {string | string[]} keys 
 */
function headers_remove(headers, keys) {
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    let lkeys = keys.map(v => v.toLowerCase());
    let okeys = Object.getOwnPropertyNames(headers);
    let deleted = false;
    okeys.forEach((key) => {
        let lkey = key.toLowerCase();
        if (lkeys.includes(lkey)) {
            delete headers[key];
            deleted = true;
        }
    })
    return deleted;
}

/**
 * 
 * @param {Object.<string, string>} headers 
 * @param {RegExp | RegExp[]} keys 
 */
function headers_remove_ex(headers, keys) {
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    let okeys = Object.getOwnPropertyNames(headers);
    let deleted = false;
    okeys.forEach(key => {
        let matched = keys.find(k => key.match(k) !== null);
        if (matched !== undefined) {
            delete headers[key];
            deleted = true;
        }
    })
    return deleted;
}

/**
 * 
 * @param {Object.<string, string>} headers 
 * @param {string | string[]} keys 
 * @param {string} value 
 */
function headers_set(headers, keys, value) {
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    let lkeys = keys.map(v => v.toLowerCase());
    let okeys = Object.getOwnPropertyNames(headers);
    let changed = false;
    okeys.forEach((key) => {
        let lkey = key.toLowerCase();
        if (lkeys.includes(lkey)) {
            headers[key] = value;
            changed = true;
        }
    })
    return changed;
}

/**
 * 
 * @param {Object.<string, string>} headers 
 * @param {RegExp | RegExp[]} keys 
 * @param {string} value 
 */
function headers_set_ex(headers, keys, value) {
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    let okeys = Object.getOwnPropertyNames(headers);
    let changed = false;
    okeys.forEach(key => {
        let matched = keys.find(k => key.match(k) !== null);
        if (matched !== undefined) {
            headers[key] = value;
            changed = true;
        }
    })
    return changed;
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

module.exports = { headers_get, headers_remove, headers_remove_ex, headers_set, headers_set_ex, get_charset }
