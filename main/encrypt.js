var MessageEncryptor = {}

MessageEncryptor.encrypt = function(buffer) {
    if (buffer instanceof Uint8Array) {
        buffer = transformToArrayBuffer(buffer)
    }
    const iv = new Uint8Array(16)
    window.crypto.getRandomValues(iv);
    const data = new Uint8Array(buffer);
    const keys = getCryptoKeys();
    const algorithmInfo =  {name: "AES-CBC", iv: new Uint8Array(iv)};
    return window.crypto.subtle.importKey(
        "raw", new Uint8Array(keys.enc), algorithmInfo, false, ["encrypt"]
    ).then(function(key) {
        return window.crypto.subtle.encrypt(
            algorithmInfo, key, data.buffer)
            .then(function(encryptedData) {
                const t = new Uint8Array(encryptedData);
                const n = new Uint8Array(iv.length + t.length);
                n.set(iv, 0);
                n.set(t, iv.length);
                const algorithmInfo = {name: "HMAC", hash: { name: "SHA-256" } };
                return window.crypto.subtle.importKey(
                    "raw", new Uint8Array(keys.mac), algorithmInfo, false, ["sign"]
                ).then(function(key) {
                    return window.crypto.subtle.sign(
                        algorithmInfo, key, n
                    ).then(function(hmac) {
                        return BinaryReader.build(hmac, n).readBuffer();
                    });
                });
        })
    });
}

MessageEncryptor.parseNodesToSend = async function(nodesInfo, isIncoming = false, tag=undefined)  {
    var packetBinaryWriter = new BinaryWriter();
    for (var i = 0; i < nodesInfo.length; i++) {
        var nodeInfo = nodesInfo[i];
        var node = nodeInfo.node;
        var counter = nodeInfo.counter;

        var nodeBinaryWriter = new BinaryWriter();
        var nodePacker = new NodePacker();

        nodePacker.writeNode(nodeBinaryWriter, node);
        var nodeBuffer = nodeBinaryWriter.toBuffer();

        var data = await MessageEncryptor.encrypt(nodeBuffer, false, isIncoming, counter);
        var frame = new WAPacket({"isMultiDevice": false, "data": data, "tag": tag, "binaryOpts": {}});
        packetBinaryWriter.pushBytes(isIncoming ? frame.serializeWithoutBinaryOpts() : frame.serialize());
        }
    return packetBinaryWriter.toBuffer();
}