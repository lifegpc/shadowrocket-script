// url-redirect-request.js
const { MyURL } = require('./mod/myurl')
/**
 * @param {string} s
 * @param {Array<RegExp>} rules
 */
function match_rules(s, rules) {
    for (let r of rules) {
        if (s.match(r) !== null) return true;
    }
    return false;
}
const REDIRECT_RULE = 0;
const REMOVE_QUERY_RULE = 1;
class MatchRule {
    constructor(rule, type = REDIRECT_RULE) {
        this.rule = rule;
        this.type = type;
    }
    /**@param {string} s*/
    match(s) {
        switch (this.type) {
            case REDIRECT_RULE:
                let m = s.match(this.rule['rule']);
                if (m != null) {
                    let pos = this.rule['pos'] || 1;
                    let s = m[pos];
                    let need_decode = this.rule["need_decode"] || true;
                    return need_decode ? decodeURIComponent(s) : s;
                } else return null;
            case REMOVE_QUERY_RULE:
                if (!match_rules(s, this.rule["basic"])) return null;
                let u = new MyURL(s);
                u.trimQuery();
                let whitelist = this.rule["whitelist"] || false;
                let oquery = u.query;
                let query = "";
                for (let r of this.rule["rules"]) {
                    let m = u.query.match(r['rule']);
                    let pos = r['pos'] || 1;
                    while (m != null) {
                        let s = m[pos];
                        u.query = u.query.replace(s, '');
                        if (whitelist) query += s;
                        m = u.query.match(r['rule']);
                    }
                }
                if (whitelist) u.query = query;
                u.trimQuery();
                return u.query == oquery ? null : u.toString();
            default:
                return null;
        }
    }
}
/**@param {number | string} s */
function parse_type(s) {
    if (s === undefined || s === null) return REDIRECT_RULE;
    if (typeof s == "number") return s;
    let o = s.toLowerCase();
    if (o == "redirect") return REDIRECT_RULE;
    if (o == "remove_query") return REMOVE_QUERY_RULE;
    return -1;
}
function parse_remove_query_rule(o) {
    let basic = Array.isArray(o['basic']) ? o['basic'].map(v => new RegExp(v, "i")) : [new RegExp(o['basic'], "i")];
    let whitelist = o['whitelist'];
    let rules = o['rules'];
    if (typeof rules == "string") {
        let rule = new RegExp(`^(?:[^&]*&)*?(${rules}\\=[^&]*&?).*`, "i");
        return { "basic": basic, "whitelist": whitelist, "rules": [{ "rule": rule }] }
    } else if (Array.isArray(rules)) {
        let rrules = [];
        for (let r of rules) {
            if (typeof r == "string") {
                let rule = new RegExp(`^(?:[^&]*&)*?(${r}\\=[^&]*&?).*`, "i");
                rrules.push({ "rule": rule });
            } else {
                let rule = new RegExp(`^(?:[^&]*&)*?(${r['rule']}\\=[^&]*&?).*`, "i");
                let pos = r['pos'];
                rrules.push({ "rule": rule, "pos": pos });
            }
        }
        return { "basic": basic, "whitelist": whitelist, "rules": rrules }
    } else {
        let rule = new RegExp(`^(?:[^&]*&)*?(${rules['rule']}\\=[^&]*&?).*`, "i");
        let pos = rules['pos'];
        return { "basic": basic, "whitelist": whitelist, "rules": [{ "rule": rule, "pos": pos }] };
    }
}
function parse_match_rules(o) {
    if (Array.isArray(o)) {
        /**@type {MatchRule[]} */
        let r = [];
        for (let i of o) {
            if (typeof i == "string") {
                let rule = new RegExp(i, "i");
                r.push(new MatchRule({ "rule": rule }));
            } else {
                let type = parse_type(i['type']);
                switch (type) {
                    case REDIRECT_RULE:
                        let rule = new RegExp(i['rule'], "i");
                        let pos = i["pos"];
                        let need_decode = i['need_decode'];
                        r.push(new MatchRule({ "rule": rule, "pos": pos, "need_decode": need_decode }));
                        break;
                    case REMOVE_QUERY_RULE:
                        r.push(new MatchRule(parse_remove_query_rule(i), REMOVE_QUERY_RULE));
                        break;
                    default:
                        throw Error("Unknown type.");
                }
            }
        }
        return r;
    } else if (typeof o == "string") {
        let rule = new RegExp(o, "i");
        return [new MatchRule({ "rule": rule })]
    } else {
        let type = parse_type(o['type']);
        switch (type) {
            case REDIRECT_RULE:
                let rule = new RegExp(o['rule'], "i");
                let pos = o["pos"];
                let need_decode = o['need_decode'];
                return [new MatchRule({ "rule": rule, "pos": pos, "need_decode": need_decode })]
            case REMOVE_QUERY_RULE:
                return [new MatchRule(parse_remove_query_rule(o), REMOVE_QUERY_RULE)]
            default:
                throw Error("Unknown type.");
        }
    }
}
let $request = globalThis['$request'];
let $httpClient = globalThis['$httpClient'];
let $persistentStore = globalThis['$persistentStore'];
/**@type {string} */
let $argument = globalThis['$argument'];
let $done = globalThis['$done'];
/**@type {Object.<string, string>} */
let headers = $request['headers'];
/**@type {string} */
let url = $request['url'];
console.log(headers);
console.log(url);
/**@returns {Promise<{status: number, headers: Object.<string, string>, data: string | Uint8Array}>} */
function fetch_data(url) {
    return new Promise((resolve, reject) => {
        $httpClient['get'](url, (error, res, data) => {
            if (error != null) {
                reject(error);
                return;
            }
            resolve({ "status": res["status"], "headers": res["headers"], "data": data })
        })
    })
}
async function get_remote_argument(url, key, cached) {
    let data = $persistentStore['read'](key);
    let now = new Date().getTime();
    if (data == null) {
        let d = await fetch_data(url);
        console.log(d);
        data = { "data": JSON.parse(d.data), "cached_time": now };
        $persistentStore['write'](JSON.stringify(data), key);
    } else {
        data = JSON.parse(data);
        let cached_time = data['cached_time'];
        if (cached_time + cached < now) {
            let d = await fetch_data(url);
            console.log(d);
            data = { "data": JSON.parse(d.data), "cached_time": now };
            $persistentStore['write'](JSON.stringify(data), key);
        }
    }
    return data['data'];
}
function get_args() {
    let a = [];
    let d = {};
    let s = $argument.split('|');
    for (let i of s) {
        let l = i.split('=');
        if (l.length == 1) {
            a.push(i);
        } else {
            let k = l[0];
            let v = l.slice(1).join('=');
            if (v.startsWith("int:")) {
                v = parseInt(v.slice(4));
            } else if (v.startsWith("bool:")) {
                v = v.slice(5).toLowerCase();
                v = v === "true";
            } else if (v.startsWith("map:")) {
                let ov = v.slice(4).split(';');
                v = {};
                let last_key = null;
                for (let iv of ov) {
                    let ivv = iv.split(':');
                    if (ivv.length > 1) {
                        last_key = ivv[0];
                        let kv = ivv.slice(1).join(":");
                        v[last_key] = kv;
                    } else if (last_key != null) {
                        v[last_key] += ";" + iv;
                    }
                }
            }
            d[k] = v;
        }
    }
    if (a.length) {
        if (d['url'] == undefined) {
            for (let i of a) {
                if (i.startsWith("http://") || i.startsWith("https://")) {
                    d['url'] = i;
                    break;
                }
            }
        }
    }
    return d;
}
async function get_argument() {
    let data = {};
    if ($argument.startsWith('{')) {
        data = JSON.parse($argument);
    } else {
        data = get_args();
        console.log(data);
    }
    let url = data['url'];
    if (typeof url == "string") {
        let key = data['key'] || url;
        let cached = data['cached'];
        if (typeof cached != "number") {
            cached = 3600000;
        }
        return await get_remote_argument(url, key, cached);
    }
    return data;
}
async function main() {
    let argument = await get_argument();
    console.log(argument);
    let rules = parse_match_rules(argument["regex"] || argument['rules']);
    let endpoint = argument['endpoint'];
    let status = argument['status'] || 302;
    let body = argument['body'] || "Redirected.";
    let theaders = Object.assign({ "Connection": "Close" }, argument['headers']);
    let netloc = endpoint != undefined ? new MyURL(endpoint).netloc : null;
    /**@type {string | null}*/
    let matched = null;
    for (let r of rules) {
        matched = r.match(url);
        if (matched != null) {
            break;
        }
    }
    if (matched != null) {
        console.log("Matched.");
        let nurl = matched;
        let u = new MyURL(nurl, url);
        url = u.toString();
        if (netloc != null) {
            theaders['Host'] = netloc
            theaders['X-LOCATION'] = url;
            console.log("New Headers:", theaders);
            $done({ "url": endpoint, "headers": theaders });
        } else {
            theaders['location'] = url;
            console.log("New Headers:", theaders);
            $done({ "response": { "status": status, "body": body, "headers": theaders } })
        }
    } else {
        $done($request);
    }
}

main().catch((error) => {
    console.log(error);
    $done({})
})
