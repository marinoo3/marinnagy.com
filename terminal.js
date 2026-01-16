const terminal = document.querySelector('.terminal');
const titleBar = terminal.querySelector('.header');
const content = terminal.querySelector('.content');
const menu = content.querySelector('ul.menu');
const textContainer = content.querySelector('.viewer');
const input = textContainer.querySelector('input#prompt');

let isDragging = false;






function unselectMenu() {
    // Unselect previous and select new
    const selected = menu.querySelector('li.active');
    if (selected) {
        selected.classList.remove('active');
    }
}

function isAction(element) {
    // Does a window as action state (minimized or maximized)
    if (element.classList.contains('minimized')) {
        return true
    }
    if (element.classList.contains('maximized')) {
        return true
    }
    return false
}

function onMouseMove(moveEvent, offsetY, offsetX) {
    if (!isDragging) return;
    terminal.style.top = `${moveEvent.clientY - offsetY}px`;
    terminal.style.left = `${moveEvent.clientX - offsetX}px`;
};

function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
};






// On menu item clicked
menu.querySelectorAll('li').forEach(action => {
    action.addEventListener('click', () => {
        unselectMenu();
        action.classList.add('active');
    }); 
});
menu.querySelectorAll(':scope > li').forEach(action => {
    action.addEventListener('mouseenter', (e) => {
        if (menu.querySelector('li.active')) {
            unselectMenu();
            e.target.classList.add('active');
        }
    });
});

// On clicked outside menu items
content.addEventListener('click', (e) => {
    input.focus();
    if (!e.target.closest('li')) {
        unselectMenu();
    }
});

// On dragging the window
titleBar.addEventListener('mousedown', (downEvent) => {
    if (isAction(terminal)) return;
    isDragging = true;
    const offsetY = downEvent.clientY - terminal.offsetTop;
    const offsetX = downEvent.clientX - terminal.offsetLeft;

    document.addEventListener('mousemove', (e) => onMouseMove(e, offsetY, offsetX));
    document.addEventListener('mouseup', onMouseUp);
});

titleBar.addEventListener('dblclick', () => {
    if (isAction(terminal)) return;
    terminal.style.top = '100%';
    terminal.style.left = '50%';
})

// Action buttons
titleBar.querySelector('#minimize').addEventListener('click', () => {
    terminal.classList.remove('maximized');
    terminal.classList.toggle('minimized');
})
titleBar.querySelector('#maximize').addEventListener('click', () => {
    terminal.classList.remove('minimized');
    terminal.classList.toggle('maximized');
})