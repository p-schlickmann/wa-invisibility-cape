var isInitializing = true
var isInvisible = true

wsHook.before = function (a) {
    const handleBefore = async function (receivedData) {
        if (!isInvisible) {
            return receivedData
        }
        try {
            const payload = MessageDecryptor.parseWS(receivedData);
            const parsedData = payload.data;
            const tag = payload.tag;
            const isEncryptedPayload = parsedData instanceof ArrayBuffer || parsedData instanceof Uint8Array
            if (!isEncryptedPayload) {
                return receivedData;
            }
            else {
                var decryptedFrames = await MessageDecryptor.decrypt(parsedData);
                if (!decryptedFrames) return receivedData
                for (var i = 0; i < decryptedFrames.length; i++) {
                    var decryptedFrameInfo = decryptedFrames[i];
                    var decryptedFrame = decryptedFrameInfo.frame;
                    var counter = decryptedFrameInfo.counter;

                    var nodeParser = new NodeParser();
                    var node = nodeParser.readNode(new NodeBinaryReader(decryptedFrame));

                    if (isInitializing) {
                        isInitializing = false;
                        console.log('Cape is working!')
                    }
                    var isAllowed = NodeHandler.isSentNodeAllowed(node, tag);
                    var manipulatedNode = node.slice();
                    if (!isAllowed) {
                        manipulatedNode[0] = "blocked_node";
                    }
                    // manipulatedNode = await NodeHandler.manipulateSentNode(manipulatedNode);
                    decryptedFrames[i] = {node: manipulatedNode, counter: counter};
                }
                return MessageEncryptor.parseNodesToSend(decryptedFrames, false, tag);
            }
        }
        catch (exception) {
            console.error(exception);
            return receivedData;
        }
    }
    return handleBefore(a)
}

wsHook.after = function (messageEvent) {
    const handleAfter = async function() {
        return messageEvent
    };
    return handleAfter();
}



