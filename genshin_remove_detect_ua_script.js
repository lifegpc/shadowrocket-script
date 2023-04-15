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
     * @param {boolean} unary
     */
    function append(tag, attrs, unary) {
        re += `<${tag}`;
        attrs.forEach(attr => {
            re += ` ${attr.name}="${attr.escaped}"`;
        })
        if (unary) re += "/";
        re += ">";
    }
    html = html.trim();
    HTMLParser(html, {
        start: (tag, attrs, unary) => {
            if (tag == "script") {
                tmp.push([tag, attrs, unary]);
                tmp2.push('');
            }
            else append(tag, attrs, unary);
        },
        chars: (text) => {
            if (tmp.length) {
                tmp2[tmp.length - 1] += text;
            } else {
                re += text;
            }
        },
        end: (tag) => {
            let append_end_tag = true;
            if (tag == "script") {
                if (tmp.length) {
                    let t = tmp.pop();
                    /**@type {string} */
                    let t2 = tmp2.pop();
                    if (t2.indexOf("navigator.userAgent.match") == -1) {
                        append(t[0], t[1], t[2]);
                        re += t2;
                    } else {
                        append_end_tag = false;
                    }
                }
            }
            if (append_end_tag) re += `</${tag}>`;
        },
        decl: (name, value) => {
            if (name == "doctype") {
                re += `<!${name} ${value}>`
            }
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
        console.log(body);
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
