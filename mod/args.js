const { $argument, $persistentStore } = require("./base_common");
const { http_get } = require("./http");

async function get_remote_argument(url, key, cached) {
    let data = $persistentStore['read'](key);
    let now = new Date().getTime();
    if (data == null) {
        let d = await http_get(url);
        console.log(d);
        data = { "data": JSON.parse(d.data), "cached_time": now };
        $persistentStore['write'](JSON.stringify(data), key);
    } else {
        data = JSON.parse(data);
        let cached_time = data['cached_time'];
        if (cached_time + cached < now) {
            let d = await http_get(url);
            console.log(d);
            data = { "data": JSON.parse(d.data), "cached_time": now };
            $persistentStore['write'](JSON.stringify(data), key);
        }
    }
    return data['data'];
}

/**@param {string} s*/
function parse_value(s) {
    if (s.startsWith("int:")) {
        return parseInt(s.slice(4));
    } else if (s.startsWith("float:")) {
        return parseFloat(s.slice(6));
    } else if (s.startsWith("bool:")) {
        let v = s.slice(5).toLowerCase();
        return v === "true";
    } else if (s.startsWith("map:")) {
        let l = s.slice(4).split(';');
        let r = {};
        let last_key = null;
        for (let i of l) {
            let li = i.split(':');
            if (li.length > 1) {
                if (li[0].startsWith("^")) {
                    r[last_key] += ";" + li.join(':').slice(1);
                } else {
                    last_key = li[0];
                    let v = li.slice(1).join(':');
                    r[last_key] = v;
                }
            } else if (last_key != null) {
                r[last_key] += ";" + i;
            }
        }
        Object.getOwnPropertyNames(r).forEach(key => {
            r[key] = parse_value(r[key]);
        })
        return r;
    } else if (s.startsWith("list:")) {
        if (s.length == 5) return [];
        let l = s.slice(5).split(';');
        let r = [];
        let ind = -1;
        for (let i of l) {
            if (ind > -1 && i.startsWith("^")) {
                r[ind] += ";" + i.slice(1)
            } else {
                r.push(i.replaceAll("\\^", "^").replaceAll("\\\\", "\\"))
                ind += 1;
            }
        }
        return r.map(v => parse_value(v))
    }
    return s;
}

/**@param {string} argument */
function get_args(argument) {
    let a = [];
    let d = {};
    let s = argument.split('|');
    for (let i of s) {
        let l = i.split('=');
        if (l.length == 1) {
            a.push(i);
        } else {
            let k = l[0];
            let v = l.slice(1).join('=');
            d[k] = parse_value(v);
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
        data = get_args($argument);
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

module.exports = { get_args, get_argument }
