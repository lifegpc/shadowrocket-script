// url-redirect-request.js
class MyURL {
    /**
     * @param {string} url
     * @param {string | MyURL | undefined} base
     */
    constructor(url, base = undefined) {
        /**@type {string}*/
        this.scheme = '';
        /**@type {string}*/
        this.netloc = '';
        /**@type {string}*/
        this.params = '';
        /**@type {string}*/
        this.query = '';
        /**@type {string}*/
        this.path = '';
        /**@type {string}*/
        let u = url.replaceAll(/[\t\r\n]/g, '');
        let i = u.indexOf(':');
        if (i > 0) {
            this.scheme = u.substring(0, i);
            u = u.substring(i + 1);
        }
        if (u.indexOf("//") == 0) {
            let delim = u.length;
            for (let s of ['/', '?', '#']) {
                let wdelim = u.indexOf(s, 2);
                if (wdelim != -1) {
                    delim = Math.min(wdelim, delim);
                }
            }
            this.netloc = u.substring(2, delim);
            u = u.substring(delim);
        }
        if (!this.netloc.length) {
            if (base === undefined) throw Error("netloc not found.");
            if (!(base instanceof MyURL)) {
                base = new MyURL(base);
            }
            this.scheme = base.scheme;
            this.netloc = base.netloc;
        }
        i = u.indexOf('?');
        if (i != -1) {
            this.query = u.substring(i + 1);
            u = u.substring(0, i);
        }
        i = u.indexOf(';');
        if (i != -1) {
            let j = u.lastIndexOf('/');
            if (j == -1) {
                this.params = u.substring(i + 1);
                u = u.substring(0, i);
            } else {
                i = u.indexOf(';', j);
                if (i != -1) {
                    this.params = u.substring(i + 1);
                    u = u.substring(0, i);
                }
            }
        }
        this.path = u;
        if (!u.startsWith("/")) {
            if (base === undefined) {
                this.path = '/' + this.path;
            } else {
                if (!(base instanceof MyURL)) {
                    base = new MyURL(base);
                }
                let i = base.path.lastIndexOf('/');
                this.path = base.path.substring(0, i) + '/' + this.path;
            }
        }
    }
    toString() {
        let s = `${this.netloc}${this.path}`;
        if (this.scheme.length) {
            s = `${this.scheme}://${s}`;
        }
        if (this.query.length) {
            s = `${s}?${this.query}`;
        }
        if (this.params.length) {
            s = `${s};${this.params}`;
        }
        return s;
    }
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
                if (s.match(this.rule["basic"]) == null) return null;
                let u = new MyURL(s);
                let whitelist = this.rule["whitelist"] || false;
                let oquery = u.query;
                let query = "";
                for (let r of this.rule["rules"]) {
                    let m = u.query.match(r['rule']);
                    let pos = this.rule['pos'] || 1;
                    while (m != null) {
                        let s = m[pos];
                        u.query = u.query.replace(s, '');
                        if (whitelist) query += s;
                        m = u.query.match(r['rule']);
                    }
                }
                if (whitelist) u.query = query;
                return u.query == oquery ? null : u.toString();
            default:
                return null;
        }
    }
}
function parse_type(s) {
    if (s === undefined || s === null) return REDIRECT_RULE;
    if (typeof s == "number") return s;
    let o = s.toLowerCase();
    if (o == "redirect") return REDIRECT_RULE;
    if (o == "remove_query") return REMOVE_QUERY_RULE;
    return -1;
}
function parse_remove_query_rule(o) {
    let basic = new RegExp(o['basic'], "i");
    let whitelist = o['whitelist'];
    let rules = o['rules'];
    if (typeof rules == "string") {
        let rule = new RegExp(`^(?:[^&]*&)*?(${rules}\\=[^&]*&?).*`, "i");
        return { basic, whitelist, rules: [{ rule }] }
    } else if (Array.isArray(rules)) {
        let rrules = [];
        for (let r of rules) {
            if (typeof r == "string") {
                let rule = new RegExp(`^(?:[^&]*&)*?(${r}\\=[^&]*&?).*`, "i");
                rrules.push({ rule });
            } else {
                let rule = new RegExp(`^(?:[^&]*&)*?(${r['rule']}\\=[^&]*&?).*`, "i");
                let pos = r['pos'];
                rrules.push({ rule, pos });
            }
        }
        return { basic, whitelist, rules: rrules }
    } else {
        let rule = new RegExp(`^(?:[^&]*&)*?(${rules['rule']}\\=[^&]*&?).*`, "i");
        let pos = rules['pos'];
        return { basic, whitelist, rules: [{ rule, pos }] };
    }
}
function parse_match_rules(o) {
    if (Array.isArray(o)) {
        /**@type {MatchRule[]} */
        let r = [];
        for (let i of o) {
            if (typeof i == "string") {
                let rule = new RegExp(i, "i");
                r.push(new MatchRule({ rule }));
            } else {
                let type = parse_type(i['type']);
                switch (type) {
                    case REDIRECT_RULE:
                        let rule = new RegExp(i['rule'], "i");
                        let pos = i["pos"];
                        let need_decode = i['need_decode'];
                        r.push(new MatchRule({ rule, pos, need_decode }));
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
        return [new MatchRule({ rule })]
    } else {
        let type = parse_type(o['type']);
        switch (type) {
            case REDIRECT_RULE:
                let rule = new RegExp(o['rule'], "i");
                let pos = o["pos"];
                let need_decode = o['need_decode'];
                return [new MatchRule({ rule, pos, need_decode })]
            case REMOVE_QUERY_RULE:
                return [new MatchRule(parse_remove_query_rule(o), REMOVE_QUERY_RULE)]
            default:
                throw Error("Unknown type.");
        }
    }
}
let headers = $request.headers;
/**@type {string} */
let url = $request.url;
console.log(headers);
console.log(url);
/**@returns {Promise<{status: number, headers: Object.<string, string>, data: string | Uint8Array}>} */
function fetch_data(url) {
    return new Promise((resolve, reject) => {
        $httpClient.get(url, (error, res, data) => {
            if (error != null) {
                reject(error);
                return;
            }
            resolve({ status: res.status, headers: res.headers, data })
        })
    })
}
async function get_remote_argument(url, key, cached) {
    let data = $persistentStore.read(key);
    let now = new Date().getTime();
    if (data == null) {
        let d = await fetch_data(url);
        console.log(d);
        data = { data: JSON.parse(d.data), cached_time: now };
        $persistentStore.write(JSON.stringify(data), key);
    } else {
        data = JSON.parse(data);
        let cached_time = data['cached_time'];
        if (cached_time + cached < now) {
            let d = await fetch_data(url);
            console.log(d);
            data = { data: JSON.parse(d.data), cached_time: now };
            $persistentStore.write(JSON.stringify(data), key);
        }
    }
    return data.data;
}
function get_args() {
    let a = [];
    let d = {};
    /**@type {Array<string>}*/
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
    let theaders = Object.assign({"Connection": "Close"}, argument['headers']);
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
            $done({ url: endpoint, headers: theaders });
        } else {
            theaders['location'] = url;
            console.log("New Headers:", theaders);
            $done({ response: { status, body, headers: theaders } })
        }
    } else {
        $done($request);
    }
}

main().catch((error) => {
    console.log(error);
    $done({})
})
