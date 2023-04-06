const { Input } = require('./input');

const INIT = 0;
const READING_HEADERS = 1;
const READING_DATA = 2;
const READING_PART_SEPARATOR = 3;

/**
 * @param {Uint8Array | string} multipartBodyBuffer
 * @param {string} boundary
 */
function parse(multipartBodyBuffer, boundary) {
    if (typeof multipartBodyBuffer == "string") {
        multipartBodyBuffer = (new TextEncoder()).encode(multipartBodyBuffer);
    }
    let lastline = ''
    let contentDispositionHeader = ''
    let contentTypeHeader = ''
    let state = INIT;
    /**@type {Array<number>}*/
    let buffer = [];
    /**@type {Array<Input>} */
    const allParts = [];
    /**@type {Array<string>}*/
    let currentPartHeaders = [];
    for (let i = 0; i < multipartBodyBuffer.length; i++) {
        const oneByte = multipartBodyBuffer[i]
        const prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null
        const newLineDetected = oneByte === 0x0a && prevByte === 0x0d
        const newLineChar = oneByte === 0x0a || oneByte === 0x0d
        if (!newLineChar) lastline += String.fromCharCode(oneByte)
        if (INIT === state && newLineDetected) {
            if ('--' + boundary === lastline) {
                state = READING_HEADERS // found boundary. start reading headers
            }
            lastline = ''
        } else if (READING_HEADERS === state && newLineDetected) {
            // parsing headers. Headers are separated by an empty line from the content. Stop reading headers when the line is empty
            if (lastline.length) {
                currentPartHeaders.push(lastline)
            } else {
                // found empty line. search for the headers we want and set the values
                for (const h of currentPartHeaders) {
                    if (h.toLowerCase().startsWith('content-disposition:')) {
                        contentDispositionHeader = h
                    } else if (h.toLowerCase().startsWith('content-type:')) {
                        contentTypeHeader = h
                    }
                }
                state = READING_DATA
                buffer = []
            }
            lastline = ''
        } else if (READING_DATA === state) {
            // parsing data
            if (lastline.length > boundary.length + 4) {
                lastline = '' // mem save
            }
            if ('--' + boundary === lastline) {
                const j = buffer.length - lastline.length
                const part = buffer.slice(0, j - 1)

                allParts.push(
                    process(contentDispositionHeader, contentTypeHeader, part)
                )
                buffer = []
                currentPartHeaders = []
                lastline = ''
                state = READING_PART_SEPARATOR
                contentDispositionHeader = ''
                contentTypeHeader = ''
            } else {
                buffer.push(oneByte)
            }
            if (newLineDetected) {
                lastline = ''
            }
        } else if (READING_PART_SEPARATOR === state) {
            if (newLineDetected) {
                state = READING_HEADERS;
            }
        }
    }
    return allParts;
}

/**
 * @param {string} contentDispositionHeader
 * @param {string} contentTypeHeader
 * @param {Array<number>} part
 * @returns {{filename: string | undefined, name: string, type: string | undefined, data: Uint8Array}}
*/
function process(contentDispositionHeader, contentTypeHeader, part) {
    let name = undefined;
    let filename = undefined;
    let data = Uint8Array.from(part);
    let type = undefined;
    let other = [];
    /**@param {string} str */
    function obj(str) {
        const k = str.split('=')
        if (k.length < 2) return;
        const a = k[0].trim()
        const b = JSON.parse(k[1].trim())
        if (a == "name") name = b;
        else if (a == "filename") filename = b;
        else other.push([a, b]);
    }
    const header = contentDispositionHeader.split(';');
    for (let h of header) {
        obj(h);
    }
    if (contentTypeHeader) {
        let tmp = contentTypeHeader.split(':');
        if (tmp.length > 1) type = tmp[1].trim()
    }
    let input = new Input(data, type, name, filename);
    for (let i of other) {
        Object.defineProperty(input, i[0], {
            value: i[1],
            writable: true,
            enumerable: true,
            configurable: true
        })
    }
    return input;
}

module.exports = parse;
