window.onload = function() {
    let isInvis = isInvisible()
    localStorage.setItem('isInvisible', isInvis ? '1' : '0')
    isInvis ? beInvisible() : beVisible()
}

document.getElementById('invis-checkbox').addEventListener('change', function (e) {
    let isInvis = isInvisible()
    localStorage.setItem('isInvisible', isInvis ? '0' : '1')
    isInvis ? beVisible() : beInvisible()
})
