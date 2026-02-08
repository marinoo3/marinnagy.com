const terminal = document.querySelector('.terminal');
const titleBar = terminal.querySelector('.header');
const content = terminal.querySelector('.content');
const menu = content.querySelector('ul.menu');
const chatbotForm = content.querySelector('form#chatbot');
const messageList = chatbotForm.querySelector('ul.messages');
const input = chatbotForm.querySelector('input#prompt');

let isDragging = false;
let sessionId = null;

const routeServer = "https://marinooo-me-exe.hf.space";
const routeAPI = routeServer + "/api";

// Sleep function
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));






// ---------------------- //
// LOGIC FUNCTIONS
// ---------------------- //



// --------------- UI

function unselectMenu() {
    // Unselect current menu item
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



function addMessage(text, user = 'you', sources = []) {
    const li = document.createElement('li');
    li.innerHTML = `(${user}) ~ ${sources.length ? `<strong>${sources.length} documents</strong> ` : ''} ${text}`;
    messageList.appendChild(li);
    // Scroll down to message
    chatbotForm.scrollTop = chatbotForm.scrollHeight;
    return li
}

function displayError(error) {
    const li = addMessage(error, 'system');
    li.classList.add('error');
}

async function clearChat() {
    const messages = messageList.querySelectorAll('li:not(.default)');
    for (const message of messages) {
        message.remove();
        await sleep(50);
    }
}


// --------------- CHATBOT API

async function pingAPI() {
    return await fetch(routeServer + '/ping');
}

async function createBotSession() {
    const response = await fetch(routeAPI + '/create_session', {
        method: 'POST'
    });
    if (!response.ok) {
        displayError("Error: failed to create session");
        return
    }

    const content = await response.json();
    return content.session_id
}

async function clearBotSession() {
    const response = await fetch(routeAPI + '/clear_session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            session_id: sessionId
        })
    });
    if (!response.ok) {
        displayError("Error: failed to clear session");
        return
    }
}

async function queryBot(message) {
    const response = await fetch(routeAPI + '/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: message,
            session_id: sessionId
        })
    });
    if (!response.ok) {
        displayError("Error: failed query chatbot");
        return
    }

    const content = await response.json();
    return {
        message: content.response,
        sources: content.sources
    }
}





// ---------------------- //
// EVENT LISTENERS
// ---------------------- //



// --------------- Window

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

terminal.addEventListener('click', () => {
    input.focus();
})



// --------------- Menu

// On menu item clicked
menu.querySelectorAll('li').forEach(item => {
    item.addEventListener('click', (e) => {
        unselectMenu();
        if (!e.target.closest('.elements > li')) {
            item.classList.add('active');
        }
    });
});
menu.querySelectorAll(':scope > li').forEach(item => {
    item.addEventListener('mouseenter', (e) => {
        if (menu.querySelector('li.active')) {
            unselectMenu();
            e.target.classList.add('active');
        }
    });
});

// On clicked outside menu items
document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu li')) {
        unselectMenu();
    }
});

// On menu action click
menu.querySelectorAll('.elements > li').forEach(button => {
    switch (button.dataset.action) {
        case 'clear-chat':
            button.onclick = () => { clearChat(); clearBotSession(); };
            break
        case 'github':
            button.onclick = () => window.open('https://github.com/marinoo3/me.exe', target='_blank');
            break
        case 'huggingface':
            button.onclick = () => window.open('https://huggingface.co/spaces/marinooo/me.exe', target='_blank');
            break
    }
});



// --------------- Chatbot

// On chatbot submit
chatbotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addMessage(input.value, 'you');
    queryBot(input.value).then(({ message, sources }) => {
        if (message) {
            addMessage(message, 'marin', sources);
        }
    })
    input.value = "";
});







// ---------------------- //
// APP INIT
// ---------------------- //

async function initSession() {
    response = await pingAPI();
    if (!response.ok) {
        // If API sleeping, wait 2 seconds 
        // and ping again
        sleep(2000).then(() => {
            initSession();
        });
    } else {
        sessionId = await createBotSession();
        chatbotForm.classList.remove('waking');
        input.focus();
    }
}

initSession();