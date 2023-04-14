const { get_charset } = require("./utils");

class Input {
    /**
     * @param {Uint8Array || string} data
     * @param {string | undefined} type
     * @param {string | undefined} name
     * @param {string | undefined} filename
     */
    constructor(data, type = undefined, name = undefined, filename = undefined) {
        /**@type {string | undefined}*/
        this.type = type;
        /**@type {Uint8Array | string}*/
        this.data = data;
        /**@type {string | undefined}*/
        this.name = name;
        /**@type {string | undefined}*/
        this.filename = filename;
    }
    get charset() {
        if (!this.is_text || typeof this.data == "string") return null;
        if (this.type !== undefined) {
            get_charset(this.type);
        }
        return "utf-8"
    }
    get is_text() {
        return typeof this.data == "string" || this.type === undefined || this.type.startsWith("text/")
    }
    get text() {
        if (typeof this.data == "string") return this.data;
        if (!this.is_text) return null;
        let charset = this.charset;
        if (charset === null) return null;
        try {
            return (new TextDecoder(charset)).decode(this.data);
        } catch (e) {
            console.log(e);
            return null;
        }
    }
}

module.exports = { Input };
