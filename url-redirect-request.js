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
async function get_argument() {
    if ($argument.startsWith('{')) {
        return JSON.parse($argument);
    } else {
        return await get_remote_argument($argument, $argument, 3600000);
    }
}
async function main() {
    let argument = await get_argument();
    /**@type {Array<RegExp>} */
    let regexs = [];
    if (Array.isArray(argument['regex'])) {
        for (let r of argument['regex']) {
            regexs.push(new RegExp(r, 'i'));
        }
    } else {
        regexs.push(new RegExp(argument['regex'], 'i'));
    }
    let endpoint = argument['endpoint'];
    let status = argument['status'] || 302;
    let body = argument['body'] || "Redirected.";
    let theaders = argument['headers'] || {};
    let netloc = endpoint != undefined ? new MyURL(endpoint).netloc : null;
    let matched = null;
    for (let r of regexs) {
        matched = url.match(r);
        if (matched != null) {
            break;
        }
    }
    if (matched != null) {
        console.log("Matched.");
        let nurl = decodeURIComponent(matched[1]);
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
