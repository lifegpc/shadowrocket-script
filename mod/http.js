const { $httpClient } = require("./base_common");

/**@returns {Promise<{status: number, headers: Object.<string, string>, data: string | Uint8Array}>} */
function http_get(url) {
    return new Promise((resolve, reject) => {
        $httpClient['get'](url, (error, res, data) => {
            if (error != null) {
                reject(error);
                return;
            }
            resolve({ "status": res["status"], "headers": res["headers"], "data": data })
        })
    })
}

module.exports = { http_get }
