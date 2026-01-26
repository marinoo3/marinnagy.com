const terminal = document.querySelector('.terminal');
const titleBar = terminal.querySelector('.header');
const content = terminal.querySelector('.content');
const menu = content.querySelector('ul.menu');
const chatbotForm = content.querySelector('form#chatbot');
const messageList = chatbotForm.querySelector('ul.messages');
const input = chatbotForm.querySelector('input#prompt');

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

function addMessage(text, bot=false) {
    const li = document.createElement('li');
    const user = bot ? "(marin)" : "(you)";
    li.textContent = `${user} ~ ${text}`;
    messageList.appendChild(li);
}






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
document.addEventListener('click', (e) => {
    input.focus();
    if (!e.target.closest('.menu li')) {
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

// On chatbot submit
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
chatbotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addMessage(input.value);
    input.value = "";
    sleep(750).then(() => {
        addMessage("Mon chat bot est en construction. Revenez dans quelques jours, ou bien envoyez-moi un e-mail !", true);
    });
});