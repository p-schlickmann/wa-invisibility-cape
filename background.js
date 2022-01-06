chrome.runtime.onMessage.addListener(onMessage);

function onMessage(messageEvent, sender, callback) {
    if (messageEvent === "getInvisibility") {
        return callback(localStorage.getItem('isInvisible'))
    }
}
