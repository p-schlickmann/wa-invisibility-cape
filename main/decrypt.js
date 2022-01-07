var MessageDecryptor = {}

MessageDecryptor.isTagBasedPayload = function(payload) {
    var looksTagBased = false;
    if (payload instanceof ArrayBuffer || payload instanceof Uint8Array)
    {
        var array = new Uint8Array(payload);
        if (array.includes(44))
        {
            for (var o, i=0, a = [];(o=array[i]) != 44;i++) // 44 == ','
                a.push(o);

            var tag = String.fromCharCode.apply(String, a);
            looksTagBased =  tag.length < 40 && !/[\x00-\x1F]/.test(tag);
        }
    }
    else
    {
        looksTagBased = true;
    }

    return looksTagBased;
}

MessageDecryptor.parseWS = function (websocket) {
    if (!MessageDecryptor.isTagBasedPayload(websocket)) return

    var t, r, n = websocket;
    if (websocket instanceof ArrayBuffer) {
        var array = new Uint8Array(websocket);
        for (var o, i=0, a = [];(o=array[i]) != 44;i++) // 44 == ','
            a.push(o);

        t = String.fromCharCode.apply(String, a);
        r = websocket.slice(i+1);

        if (r.byteLength % 16 != 0)
        {
            // this is a client-to-phone binary message.
            var dataArray = new Uint8Array(r);
            if (dataArray[0] == ",")
            {
                // no binaryOpts
                r = r.slice(1);
            }
            else
            {
                var metric = dataArray[1]; // message type
                var binaryFlags = dataArray[2];
                r = r.slice(2);

                return { tag: t, data: r, metric: metric, binaryFlags: binaryFlags }
            }
        }
    }
    else
    {
        var d = websocket.indexOf(",");
        t = websocket.slice(0, d);
        r = websocket.slice(d + 1);
        if (r[0] == ",") r = r.slice(1);

        try {
            r = JSON.parse(r);
        } catch (e) {
            // just leave it unparsed
        }
    }
    return { tag: t, data: r }
}

MessageDecryptor.decrypt = async function(buffer) {
    if (buffer instanceof Uint8Array) {
        buffer = transformToArrayBuffer(buffer)
    }
    const algorithm = {name: "AES-CBC", iv: new Uint8Array(buffer.slice(32, 48))}
    const keys = getCryptoKeys();
    if (!keys) return
    const key = await window.crypto.subtle.importKey(
        "raw", new Uint8Array(keys.enc),
        algorithm, false, ["decrypt"]
    );
    const decrypted = await window.crypto.subtle.decrypt(
        algorithm, key, buffer.slice(48)
    );
    return [{ frame: decrypted, counter: 0 }];
}
