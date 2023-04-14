const { HTMLParser } = require('./mod/htmlparser');
const { $response, $done } = require('./mod/base_response');
const { headers_get, get_charset } = require('./mod/utils');

/**@param {string} html */
function filterHTML(html) {
    let re = '';
    let tmp = [];
    let tmp2 = [];
    /**
     * @param {string} tag
     * @param {{name: string, value: string, escaped: string}[]} attrs
     */
    function append(tag, attrs) {
        re += `<${tag}`;
        attrs.forEach(attr => {
            re += ` ${attr.name}="${attr.escaped}"`;
        })
        re += ">";
    }
    html = html.trim();
    html = html.replace(/<!doctype [a-z0-9]+>/i, '');
    HTMLParser(html, {
        start: (tag, attrs, unary) => {
            if (tag == "script") {
                tmp.push([tag, attrs]);
                tmp2.push('');
            }
            else append(tag, attrs);
        },
        chars: (text) => {
            if (tmp.length) {
                tmp2[tmp.length - 1] += text;
            } else {
                re += text;
            }
        },
        end: (tag) => {
            if (tag == "script") {
                if (tmp.length) {
                    let t = tmp.pop();
                    /**@type {string} */
                    let t2 = tmp2.pop();
                    if (t2.indexOf("navigator.userAgent.match") == -1) {
                        append(t[0], t[1]);
                        re += t2;
                    }
                }
            }
            re += `</${tag}>`;
        }
    })
    return re;
}

function main() {
    let headers = $response['headers'];
    let content_type = headers_get(headers, "content-type");
    console.log("Content-Type", content_type);
    if (content_type === undefined) content_type = "text/html";
    content_type = content_type.trim();
    if (content_type.startsWith("text/html")) {
        let body = $response['body'];
        if (body === undefined) return {};
        let is_binary = body instanceof Uint8Array;
        let charset = is_binary ? (get_charset(content_type) || "utf-8") : "";
        if (is_binary) {
            body = (new TextDecoder(charset)).decode(body);
        }
        let r = filterHTML(body);
        return { 'body': is_binary ? (new TextEncoder(charset)).encode(r) : r };
    } else {
        return {};
    }
}

try {
    let r = main();
    console.log(r);
    $done(r)
} catch (e) {
    console.log(e);
    $done({})
}
