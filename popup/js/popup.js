function isInvisFromStorage() {
    return localStorage.getItem('isInvisible') === '1'
}

function fillInfoFromStorage() {
    isInvisFromStorage() ? beInvisible(true) : beVisible(true)
}

function beInvisible(forced=false) {
    localStorage.setItem('isInvisible', '1')
    if (forced) {
        document.querySelector('#invis-checkbox').setAttribute('checked', 'true')
    }
    document.querySelector('#status-text').innerHTML = 'CAPE IS ON'
    document.querySelector('body').style.backgroundImage = 'url("./images/invis.jpeg")'
}

function beVisible(forced=false) {
    localStorage.setItem('isInvisible', '0')
    if (forced) {
        document.querySelector('#invis-checkbox').removeAttribute('checked')
    }
    document.querySelector('#status-text').innerHTML = 'CAPE IS OFF'
    document.querySelector('body').style.backgroundImage = 'url("./images/cape.png")'
}

document.addEventListener("DOMContentLoaded", fillInfoFromStorage, true);

document.getElementById('invis-checkbox').addEventListener('change', function (e) {
    isInvisFromStorage() ? beVisible() : beInvisible()
})