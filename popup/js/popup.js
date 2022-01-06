var isInvisFromStorage


const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (result[key] === undefined) {
                reject();
            } else {
                resolve(result[key]);
            }
        });
    });
};

function syncInvisibilityStatus() {
    isInvisFromStorage = readLocalStorage('isInvis')
}

function fillInfoFromStorage() {
    syncInvisibilityStatus()
    isInvisFromStorage ? beInvisible(true) : beVisible(true)

}

function beInvisible(forced=false) {
    // console.log('dispatching be invisible')
    if (forced) {
        document.querySelector('#invis-checkbox').setAttribute('checked', 'true')
    }
    document.querySelector('#status-text').innerHTML = 'CAPE IS ON'
    document.querySelector('body').style.backgroundImage = 'url("./images/invis.jpeg")'
}

function beVisible(forced=false) {
    // console.log('dispatching be visible')
    // try {
    //     chrome.runtime.sendMessage({ name: "setInvisibility", isInvis: '0' });
    // } catch (e) {
    //     console.log(e)
    // }
    if (forced) {
        document.querySelector('#invis-checkbox').removeAttribute('checked')
    }
    document.querySelector('#status-text').innerHTML = 'CAPE IS OFF'
    document.querySelector('body').style.backgroundImage = 'url("./images/cape.png")'
}

document.addEventListener("DOMContentLoaded", fillInfoFromStorage, true);

document.getElementById('invis-checkbox').addEventListener('change', function (e) {
    chrome.storage.local.set({isInvis: e.target.checked});
    syncInvisibilityStatus()
    isInvisFromStorage ? beInvisible() : beVisible()
})