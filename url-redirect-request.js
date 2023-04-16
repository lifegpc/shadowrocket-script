// url-redirect-request.js
const { MyURL } = require('./mod/myurl')
const { $request, $done } = require('./mod/base_request');
const { get_argument } = require('./mod/args');
const { headers_remove_ex, headers_set_ex } = require('./mod/utils');
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
const CHANGE_HEADER_RULE = 2;
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
                if (match_rules(s, this.rule["exclude"])) return null;
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
    /**
     * @param {string} s
     * @param {Object.<string, string>} headers*/
    change_headers(s, headers) {
        switch (this.type) {
            case CHANGE_HEADER_RULE:
                if (!match_rules(s, this.rule["basic"])) return false;
                if (match_rules(s, this.rule["exclude"])) return false;
                let rules = this.rule["rules"];
                let always_set = this.rule["always_set"];
                let value = this.rule['value'];
                if (value === undefined) {
                    return headers_remove_ex(headers, rules);
                } else {
                    let re = headers_set_ex(headers, rules, value);
                    if (!re && always_set) {
                        headers[always_set] = value;
                        return true;
                    }
                    return re;
                }
            default:
                return false;
        }
    }
    get is_change_headers() {
        switch (this.type) {
            case CHANGE_HEADER_RULE:
                return true;
            default:
                return false;
        }
    }
    get is_always() {
        switch (this.type) {
            case CHANGE_HEADER_RULE:
                return true;
            default:
                return false;
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
    if (o == "change_header") return CHANGE_HEADER_RULE;
    return -1;
}
function parse_remove_query_rule(o) {
    let basic = Array.isArray(o['basic']) ? o['basic'].map(v => new RegExp(v, "i")) : [new RegExp(o['basic'], "i")];
    let whitelist = o['whitelist'];
    let rules = o['rules'];
    let exclude = Array.isArray(o['exclude']) ? o['exclude'].map(v => new RegExp(v, "i")) : o['exclude'] ? [new RegExp(o['exclude'], "i")] : [];
    if (typeof rules == "string") {
        let rule = new RegExp(`^(?:[^&]*&)*?(${rules}\\=[^&]*&?).*`, "i");
        return { "basic": basic, "whitelist": whitelist, "rules": [{ "rule": rule }], "exclude": exclude }
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
        return { "basic": basic, "whitelist": whitelist, "rules": rrules, "exclude": exclude }
    } else {
        let rule = new RegExp(`^(?:[^&]*&)*?(${rules['rule']}\\=[^&]*&?).*`, "i");
        let pos = rules['pos'];
        return { "basic": basic, "whitelist": whitelist, "rules": [{ "rule": rule, "pos": pos }], "exclude": exclude };
    }
}
const CHANGE_HEADER_RULE_FAILED = "Failed to parse change header rule.";
function parse_change_header_rule(o) {
    let basic = Array.isArray(o['basic']) ? o['basic'].map(v => new RegExp(v, "i")) : [new RegExp(o['basic'], "i")];
    let rules = o['rules'];
    let exclude = Array.isArray(o['exclude']) ? o['exclude'].map(v => new RegExp(v, "i")) : o['exclude'] ? [new RegExp(o['exclude'], "i")] : [];
    /**@type {string | undefined} */
    let always_set = o['always_set'];
    if (always_set !== undefined && typeof always_set !== "string") {
        throw Error(CHANGE_HEADER_RULE_FAILED)
    }
    /**@type {string | undefined} */
    let value = o['value'];
    if (value !== undefined) {
        if (typeof value !== "string") {
            throw Error(CHANGE_HEADER_RULE_FAILED)
        }
    }
    if (typeof rules == "string") {
        let rule = new RegExp(`^${rules}$`, "i");
        return { "basic": basic, "rules": [rule], "exclude": exclude, 'value': value, "always_set": always_set }
    } else if (Array.isArray(rules)) {
        let rrules = [];
        for (let r of rules) {
            if (typeof r == "string") {
                rrules.push(new RegExp(`^${r}$`, "i"));
            } else {
                throw Error(CHANGE_HEADER_RULE_FAILED)
            }
        }
        return { "basic": basic, "rules": rrules, "exclude": exclude, 'value': value, "always_set": always_set }
    } else {
        throw Error(CHANGE_HEADER_RULE_FAILED)
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
                    case CHANGE_HEADER_RULE:
                        r.push(new MatchRule(parse_change_header_rule(i), CHANGE_HEADER_RULE));
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
            case CHANGE_HEADER_RULE:
                return [new MatchRule(parse_change_header_rule(o), CHANGE_HEADER_RULE)]
            default:
                throw Error("Unknown type.");
        }
    }
}
let headers = $request['headers'];
let url = $request['url'];
console.log(headers);
console.log(url);
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
        if (r.is_always) continue;
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
        let result = {};
        let headers_changed = false;
        for (let r of rules) {
            if (!r.is_always) continue;
            if (r.is_change_headers) {
                headers_changed = r.change_headers(url, headers);
            }
        }
        if (headers_changed) {
            console.log("New Headers:", headers);
            result['headers'] = headers;
        }
        $done({});
    }
}

main().catch((error) => {
    console.log(error);
    $done({})
})
