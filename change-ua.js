const ua = $argument || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36";
let headers = $request.headers;
headers['USER-AGENT'] = ua;
$done({headers})
