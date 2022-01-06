var isInitializing = true
var isInvisible = true

wsHook.before = function (a) {
    var handleBefore = async function (receivedData) {
        if (!isInvisible) {
            return receivedData
        }

        try {
            const payload = MessageDecryptor.parseWS(receivedData);
            const parsedData = payload.data;
            const tag = payload.tag;
            const isEncryptedPayload = parsedData instanceof ArrayBuffer || parsedData instanceof Uint8Array
            if (!isEncryptedPayload) {
                console.log('not encrypted')
                return receivedData;
            }
            else {
                var decryptedFrames = await MessageDecryptor.decrypt(parsedData);
                if (!decryptedFrames) return receivedData
                const manipulatedFramesPromises = decryptedFrames.map(async (frameInfo) => {
                    const frame = frameInfo.frame
                    const counter = frameInfo.counter

                    const nodeParser = new NodeParser()
                    const node = nodeParser.readNode(new NodeBinaryReader(frame));

                    if (isInitializing) {
                        isInitializing = false;
                        console.log("Interception is working.");
                    }
                    let manipulatedNode = node.slice();
                    if (!NodeHandler.isSentNodeAllowed(node, tag)) {
                        manipulatedNode[0] = "blocked_node";
                    }
                    manipulatedNode = await NodeHandler.manipulateSentNode(manipulatedNode);
                    return {node: manipulatedNode, counter: counter};
                })
                return MessageEncryptor.parseNodesToSend(Promise.all(manipulatedFramesPromises), false, tag);
            }
        }
        catch (exception) {
            console.error("Exception a");
            console.error(exception);
            return receivedData;
        }
    }
    return handleBefore(a)
}

wsHook.after = function (messageEvent) {
    console.log(messageEvent)
    var handleAfter = async function() {
        return messageEvent
        try {
            const payload = MessageDecryptor.parseWS(messageEvent.data);
            const tag = payload.tag;
            const data = payload.data;
            console.log(payload, 'payload after')
            const isEncryptedPayload = data instanceof ArrayBuffer || data instanceof Uint8Array
            if (isEncryptedPayload)
            {
                var decryptedFrames = await MessageDecryptor.decrypt(data);
                if (!decryptedFrames) return messageEvent;

                for (var i = 0; i < decryptedFrames.length; i++)
                {
                    var decryptedFrameInfo = decryptedFrames[i];
                    var decryptedFrame = decryptedFrameInfo.frame;
                    var counter = decryptedFrameInfo.counter;

                    var nodeParser = new NodeParser();
                    var node = nodeParser.readNode(new NodeBinaryReader(decryptedFrame));

                    var isAllowed = await NodeHandler.isReceivedNodeAllowed(node, tag);
                    var manipulatedNode = node.slice();
                    if (!isAllowed)
                    {
                        manipulatedNode[0] = "blocked_node";
                    }

                    manipulatedNode = await NodeHandler.manipulateReceivedNode(manipulatedNode, tag);
                    decryptedFrames[i] = {node: manipulatedNode, counter: counter};
                }
                return MessageEncryptor.parseNodesToSend(Promise.all(decryptedFrames), true, tag).then(function (packet)
                {
                    messageEvent.data = packet;
                    return messageEvent;
                })

            }
            else {
                return messageEvent;
            }
        }
        catch (e) {
            console.error(e);
            return messageEvent;
        }

    };
    console.log(handleAfter())
    return handleAfter();
}