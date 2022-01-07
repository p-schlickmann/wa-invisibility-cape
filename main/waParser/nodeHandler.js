var NodeHandler = {};

NodeHandler.isSentNodeAllowed = function (node, tag)
{
    var subNodes = [node];
    if (Array.isArray(nodeReader.children(node)))
    {
        subNodes = subNodes.concat(nodeReader.children(node));
    }
    for (var i = 0; i < subNodes.length; i++) {
        var child = subNodes[i];
        var action = child[0];
        var shouldBlock = ['read', 'receipt', 'available', 'presence', 'composing', 'received'].includes(action)
        if (shouldBlock) {
            switch (action) {
                case "read":
                case "receipt":
                    if (action === "read" && wsHook.onMessage) {
                        // TODO: in multi-device, not sending an error message back to the client results in a lot of repeated attempts.

                        var messageEvent = new MutableMessageEvent({ data: tag + ",{\"status\": 403}" });
                        wsHook.onMessage(messageEvent);
                    }

                    break;
                case "presence":
                    break;
            }
            return false;
        }
    }
    return true;
}

NodeHandler.manipulateSentNode = async function (node) {
    try {
        if (nodeReader.tag(node) !== "message" && nodeReader.tag(node) !== "action") return node;

        if (nodeReader.tag(node) === "action") {
            var children = nodeReader.children(node);
            for (var i = 0; i < children.length; i++)
            {
                var child = children[i];
                if (nodeReader.tag(child) === "message") {
                    var messageNode = await this.manipulateSentMessageNode(child);
                    children[i] = messageNode;
                }
            }
        }

    }
    catch (exception)
    {
        console.error("WhatsIncognito: Allowing WA packet due to exception:");
        console.error(exception);
        console.error(exception.stack);
        return node;
    }

    return node;
}

NodeHandler.manipulateSentMessageNode = async function (messageNode) {
    const message = await parseMessage(messageNode);
    if (message == null || message.key == null) return;
    return messageNode;
}

NodeHandler.isReceivedNodeAllowed = async function (node, tag) {
    console.log(node)
    return true
}

NodeHandler.manipulateReceivedNode = async function (node) {
    var messages = [];
    var children = nodeReader.children(node);
    var type = nodeReader.attr("type", node);

    return node;
}

async function parseMessage(e) {
    switch (nodeReader.tag(e))
    {
        case "message":
            return messageTypes.WebMessageInfo.parse(nodeReader.children(e));
        case "groups_v2":
        case "broadcast":
        case "notification":
        case "call_log":
        case "security":
            return null;
        default:
            return null;
    }
}

var nodeReader = {
        tag: function (e) { return e && e[0] },
        attr: function (e, t) { return t && t[1] ? t[1][e] : void 0 },
        attrs: function (e) { return e[1] },
        child: function s(e, t)
        {
            var r = t[2];
            if (Array.isArray(r))
                for (var n = r.length, o = 0; o < n; o++)
                {
                    var s = r[o];
                    if (Array.isArray(s) && s[0] === e)
                        return s
                }
        },
        children: function (e)
        {
            return e && e[2]
        },
        dataStr: function (e)
        {
            if (!e) return "";
            var t = e[2];
            return "string" == typeof t ? t : t instanceof ArrayBuffer ? new BinaryReader(t).readString(t.byteLength) : void 0
        }
    }
