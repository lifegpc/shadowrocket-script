// type=http-request,script-path=https://github.com/lifegpc/shadowrocket-script/raw/master/pixiv-image-add-referer.js,pattern=^https?://i\.pximg\.net/,enable=true
let headers = $request.headers || {};
headers['referer'] = 'https://www.pixiv.net/';
$done({headers})
