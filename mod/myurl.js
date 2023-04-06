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
    trimQuery() {
        while (this.query.endsWith("&")) {
            this.query = this.query.slice(0, this.query.length - 1);
        }
    }
}

module.exports = { MyURL }
