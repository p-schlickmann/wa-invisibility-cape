function isInvisible() {
    return localStorage.getItem('isInvisible') === '1'
}

function beInvisible() {
    document.querySelector('#invis-checkbox').setAttribute('checked', 'true')
    document.querySelector('#status-text').innerHTML = 'CAPE IS ON'
    document.querySelector('body').style.backgroundImage = 'url("../images/invis.jpeg")'
}

function beVisible() {
    document.querySelector('#invis-checkbox').removeAttribute('checked')
    document.querySelector('#status-text').innerHTML = 'CAPE IS OFF'
    document.querySelector('body').style.backgroundImage = 'url("../images/cape.png")'
}