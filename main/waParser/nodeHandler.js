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
            switch (action)
            {
                case "read":
                case "receipt":
                    // We do not allow sending this read receipt.
                    // invoke the callback and fake a failure response from server
                    if (action == "read" && wsHook.onMessage) {
                        // TODO: in multi-device, not sending an error message back to the client results in a lot of repeated attempts.

                        var messageEvent = new MutableMessageEvent({ data: tag + ",{\"status\": 403}" });
                        wsHook.onMessage(messageEvent);
                    }

                    break;
                case "presence":
                    //var messageEvent = new MutableMessageEvent({ data: tag + ",{\"status\": 200}" });
                    //wsHook.onMessage(messageEvent);
                    break;
            }

            console.log("WhatsIncognito: --- Blocking " + action.toUpperCase() + " action! ---");
            console.log(node);

            return false;
        }
    }
    return true;
}

NodeHandler.manipulateSentNode = async function (node, isMultiDevice)
{
    try
    {
        if (nodeReader.tag(node) != "message" && nodeReader.tag(node) != "action") return node;

        if (nodeReader.tag(node) == "action") {
            var children = nodeReader.children(node);
            for (var i = 0; i < children.length; i++)
            {
                var child = children[i];
                if (nodeReader.tag(child) == "message")
                {
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

NodeHandler.manipulateSentMessageNode = async function (messageNode)
{
    var remoteJid = null;
    var isMultiDevice = messageNode[1];

    if (!isMultiDevice)
    {
        var message = await parseMessage(messageNode);
        if (message == null || message.key == null) return;
        remoteJid = message.key.remoteJid;
    }
    else
    {
        // multi device
        if (nodeReader.tag(messageNode) != "to") debugger;
        remoteJid = messageNode[1]["jid"] ? messageNode[1]["jid"]: messageNode[1]["from"];
    }

    if (remoteJid && false)
    {
        // If the user replyed to a message from this JID,
        // It probably means we can send read receipts for it.

        var chat = getChatByJID(remoteJid);
        var data = { jid: chat.id, index: chat.lastReceivedKey.id, fromMe: chat.lastReceivedKey.fromMe, unreadCount: chat.unreadCount };
        setTimeout(function () { document.dispatchEvent(new CustomEvent('sendReadConfirmation', { detail: JSON.stringify(data) })); }, 600);
    }

    // do message manipulation if needed
    //         ...
    var putBreakpointHere = 1;

    if (!isMultiDevice)
    {
        // TODO: following lines are commented out due to non-complete message types
        // re-assmble everything
        //messageBuffer = messageTypes.WebMessageInfo.encode(message).readBuffer();
        //messageNode[2] = messageBuffer;
    }

    return messageNode;
}

NodeHandler.isReceivedNodeAllowed = async function (node, tag) {
    console.log(node)
    return true
}

NodeHandler.manipulateReceivedNode = async function (node)
{
    var messages = [];
    var children = nodeReader.children(node);
    var type = nodeReader.attr("type", node);

    return node;
}

var messages = [];
var isScrappingMessages = false;
var epoch = 8;

NodeHandler.scrapMessages = function (jid, index, count)
{
    messages = [];
    var startNode = ["query", {
        "type": "message", "kind": "before", "jid": jid, "count": count.toString(),
        "index": index, "owner": "true", "epoch": (epoch++).toString()
    }, null];
    WACrypto.sendNode(startNode);
    isScrappingMessages = true;
}

async function parseMessage(e)
{
    var children = nodeReader.children(e);
    var isMultiDevice = Array.isArray(children) && nodeReader.tag(children[0]) == "enc";

    if (!isMultiDevice)
    {
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
    else
    {
        return decryptE2EMessage(e);
    }
}

async function decryptE2EMessage(messageNode)
{
    if (messageNode[2][0][0] != "enc") return null;

    var remoteJid = messageNode[1]["jid"] ? messageNode[1]["jid"] : messageNode[1]["from"];

    var ciphertext = messageNode[2][0][2];
    var chiphertextType = messageNode[2][0][1]["type"];

    var storage = new moduleRaid().findModule("getSignalProtocolStore")[0].getSignalProtocolStore();
    storage.flushBufferToDiskIfNotMemOnlyMode();

    // back up the signal database
    var signalDBRequest = indexedDB.open("signal-storage", 70);
    var signalDB = await new Promise((resolve, reject) => { signalDBRequest.onsuccess = () => { resolve(signalDBRequest.result); }
        signalDBRequest.onerror = () => {console.error("can't open signal-storage."); reject(false);}
    });
    var exported = await exportIdbDatabase(signalDB);

    // decrypt the message
    var address = new libsignal.SignalProtocolAddress(remoteJid.substring(0, remoteJid.indexOf("@")), 0);
    var sessionCipher = new libsignal.SessionCipher(storage, address);
    var message = chiphertextType == "pkmsg" ? await sessionCipher.decryptPreKeyWhisperMessage(ciphertext)
        : await sessionCipher.decryptWhisperMessage(ciphertext);

    // unpad the message
    message = new Uint8Array(message);
    message = new Uint8Array(message.buffer,message. byteOffset,message.length - message[message.length - 1]);

    // restore the signal database
    await clearDatabase(signalDB);
    importToIdbDatabase(signalDB, exported);
    await new Promise((resolve, reject) => { setTimeout(() => {signalDB.close(); resolve();}, 80); });

    storage.deleteAllCache();

    return messageTypes.Message.parse(message);

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

function exposeWhatsAppAPI()
{
    window.WhatsAppAPI = {}

    var moduleFinder = moduleRaid();
    window.WhatsAppAPI.downloadManager = moduleFinder.findModule("downloadAndDecrypt")[0];
    window.WhatsAppAPI.Store = moduleFinder.findModule("Msg")[1];
    window.WhatsAppAPI.Seen = moduleFinder.findModule("sendSeen")[0];

    if (window.WhatsAppAPI.Seen == undefined)
    {
        console.error("WhatsAppWebIncognito: Can't find the WhatsApp API. Sending read receipts might not work.");
    }
}

var deletedDB = indexedDB.open("deletedMsgs", 1);

deletedDB.onupgradeneeded = function (e)
{
    // triggers if the client had no database
    // ...perform initialization...
    let db = deletedDB.result;
    switch (e.oldVersion)
    {
        case 0:
            db.createObjectStore('msgs', { keyPath: 'id' });
            console.log('WhatsIncognito: Deleted messages database generated');
            break;
    }
};
deletedDB.onerror = function ()
{
    console.error("WhatsIncognito: Error opening database");
    console.error("Error", deletedDB);
};
deletedDB.onsuccess = () =>
{

}

const saveDeletedMessage = async (retrievedMsg, deletedMessageKey, revokeMessageID) =>
{
    // Determine author data
    let author = "";
    if (deletedMessageKey.fromMe || !retrievedMsg.isGroupMsg)
        author = retrievedMsg.from.user;
    else
        author = retrievedMsg.author.user;

    let body = "";
    let isMedia = false;

    // Stickers & Documents are not considered media for some reason, so we have to check if it has a mediaKey and also set isMedia == true
    if (retrievedMsg.isMedia || retrievedMsg.mediaKey)
    {
        isMedia = true;

        // get extended media key
        try
        {
            const decryptedData = await WhatsAppAPI.downloadManager.default.downloadAndDecrypt({ directPath: retrievedMsg.directPath,
                encFilehash: retrievedMsg.encFilehash,
                filehash: retrievedMsg.filehash,
                mediaKey: retrievedMsg.mediaKey,
                type: retrievedMsg.type, signal: (new AbortController).signal });
            body = arrayBufferToBase64(decryptedData);

        }
        catch (e) { console.error(e); }
    }
    else
    {
        body = retrievedMsg.body;
    }

    let deletedMsgContents = {}
    deletedMsgContents.id = revokeMessageID;
    deletedMsgContents.originalID = retrievedMsg.id.id;
    deletedMsgContents.body = body;
    deletedMsgContents.timestamp = retrievedMsg.t;
    deletedMsgContents.from = author;
    deletedMsgContents.isMedia = isMedia;
    deletedMsgContents.fileName = retrievedMsg.filename;
    deletedMsgContents.mimetype = retrievedMsg.mimetype;
    deletedMsgContents.type = retrievedMsg.type;
    deletedMsgContents.mediaText = retrievedMsg.text;
    deletedMsgContents.Jid = deletedMessageKey.remoteJid;
    deletedMsgContents.lng = retrievedMsg.lng;
    deletedMsgContents.lat = retrievedMsg.lat;

    if ("id" in deletedMsgContents)
    {
        const transcation = deletedDB.result.transaction('msgs', "readwrite");
        let request = transcation.objectStore("msgs").add(deletedMsgContents);
        request.onerror = (e) =>
        {

            // ConstraintError occurs when an object with the same id already exists
            if (request.error.name == "ConstraintError")
            {
                console.log("WhatsIncognito: Error saving message, message ID already exists");
            }
            else
            {
                console.log("WhatsIncognito: Unexpected error saving deleted message");
            }
        };
        request.onsuccess = (e) =>
        {
            console.log("WhatsIncognito: Saved deleted message with ID " + deletedMsgContents.id + " from " + deletedMsgContents.from + " successfully.");
        }
    }
    else
    {
        console.log("WhatsIncognito: Deleted message contents not found");
    }

}