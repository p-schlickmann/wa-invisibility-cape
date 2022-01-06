var transformToArrayBuffer = function(arr) {
    return arr.buffer.slice(arr.byteOffset, arr.byteLength + arr.byteOffset);
}

var base64ToArrayBuffer = function (base64) {
    const binaryStr = window.atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    return bytes.map((byte, idx) => binaryStr.charCodeAt(idx)).buffer
}

var getCryptoKeys = function() {
    let secretKeys = window.localStorage.getItem("WASecretBundle")
    if (!secretKeys) return
    let parsedKeys = JSON.parse(secretKeys);
    return {
        mac: base64ToArrayBuffer(parsedKeys["macKey"]),
        enc: base64ToArrayBuffer(parsedKeys["encKey"]),
    };
}
