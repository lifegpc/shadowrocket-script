const { $argument } = require('./mod/base_common');
const { $done, $request } = require('./mod/base_request');

let headers = {};
let oheaders = $request['headers'];
Object.getOwnPropertyNames(oheaders).forEach(k => {
    let v = oheaders[k];
    if (k.toLowerCase() === "user-agent") {
        headers[k] = $argument || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36";
    } else {
        headers[k] = v;
    }
})
$done({"headers": headers})
