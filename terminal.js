const terminal = document.querySelector('.terminal');
const titleBar = terminal.querySelector('.header');
const content = terminal.querySelector('.content');
const menu = content.querySelector('ul.menu');
const chatbotForm = content.querySelector('form#chatbot');
const messageList = chatbotForm.querySelector('ul.messages');
const input = chatbotForm.querySelector('input#prompt');

let sessionId = null;

// const routeServer = "https://marinooo-me-exe.hf.space";
const routeServer = "http://127.0.0.1:8000";
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

function onMouseMove(moveEvent, window, offsetY, offsetX) {
    if (window.dataset.isDragging == 'false') return
    window.style.top = `${moveEvent.clientY - offsetY}px`;
    window.style.left = `${moveEvent.clientX - offsetX}px`;
};

function onMouseUp(window) {
    window.dataset.isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
};

function addMessage(text, user = 'you', context = null) {
    // Create message element
    const li = document.createElement('li');
    li.textContent = `(${user}) ~ `;
    // Append RAG context if exists
    if (context?.id) {
        const strong = document.createElement('strong');
        strong.textContent = `${context.length} documents`;
        // Load documents window on click
        strong.addEventListener('click', () => {
            loadRAGDocuments(context.id);
        });
        li.appendChild(strong);
        li.append(' ');
    }
    // Append message text
    li.append(text);
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

async function createProjectionWindow() {
    console.log('hello');
    // Load projection window
    const res = await fetch('elements/projection_window.html');
    const html = await res.text();
    // Render the window
    const container = document.querySelector('body .container');
    container.insertAdjacentHTML('beforeend', html);
    const projection = container.querySelector('.window.projection');
    // On drag
    projection.querySelector('.header').addEventListener('mousedown', (downEvent) => {
        projection.dataset.isDragging = true;
        const offsetY = downEvent.clientY - projection.offsetTop;
        const offsetX = downEvent.clientX - projection.offsetLeft;
        document.addEventListener('mousemove', (e) => onMouseMove(e, projection, offsetY, offsetX));
        document.addEventListener('mouseup', () => onMouseUp(projection));
    });
    // On close
    projection.querySelector('#close').addEventListener('click', () => {
        projection.remove();
    });
    return projection
}

async function createDocumentsWindow(contextId) {
    // Load document window
    const res = await fetch('elements/documents_window.html');
    const html = await res.text();
    // Render the window
    const container = document.querySelector('body .container');
    container.insertAdjacentHTML('beforeend', html);
    const documents = container.querySelector('.window.documents');
    // On drag
    documents.querySelector('.header').addEventListener('mousedown', (downEvent) => {
        documents.dataset.isDragging = true;
        const offsetY = downEvent.clientY - documents.offsetTop;
        const offsetX = downEvent.clientX - documents.offsetLeft;
        document.addEventListener('mousemove', (e) => onMouseMove(e, documents, offsetY, offsetX));
        document.addEventListener('mouseup', () => onMouseUp(documents));
    });
    // On project clicked
    documents.querySelector('button#project').addEventListener('click', () => {
        loadRAGProjection(contextId);
    })
    // On close
    documents.querySelector('#close').addEventListener('click', () => {
        documents.remove();
    });
    return documents
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

async function downloadBotSession(format) {
    // Request conversation file to API
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    params.append('format', format);
    const response = await fetch(routeAPI + `/download_session?${params}`);
    if (!response.ok) displayError('Failed to download conversation');

    // Create file
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const fileName = `session_${sessionId}.${format}`;

    // Download file
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
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
        context: content.context
    }
}

async function loadRAGProjection(contextId) {
    // Load document windows if doesn't exist
    let projectionWindow = document.querySelector('.window.projection');
    if (!projectionWindow) {
        projectionWindow = await createProjectionWindow();
    }
    
    // Request documents to API
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    params.append('context_id', contextId);
    const response = await fetch(routeAPI + `/plot_context?${params}`);
    const content = await response.json();
    
    const plotContainer = projectionWindow.querySelector('#projection-plot');
    const fig = JSON.parse(content['3d_scatter']);
    await Plotly.newPlot(plotContainer, fig.data, fig.layout, { responsive: true });
}

async function loadRAGDocuments(contextId) {
    // Load document windows if doesn't exist
    let documentWindow = document.querySelector('.window.documents');
    if (!documentWindow) {
        documentWindow = await createDocumentsWindow(contextId);
    }

    // Request documents to API
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    params.append('context_id', contextId);
    const response = await fetch(routeAPI + `/get_context?${params}`);
    const content = await response.json();

    // Render documents
    const filesTable = documentWindow.querySelector('.files tbody');
    filesTable.innerHTML = ''; // erase previous content
    content.chunks.forEach(chunk => {
        const tr = document.createElement('tr');
        // source name
        const name = document.createElement('td');
        name.textContent = chunk.source.name;
        tr.appendChild(name);
        // chunk distance
        const distance = document.createElement('td');
        distance.textContent = chunk.distance;
        tr.appendChild(distance);
        // chunk score
        const score = document.createElement('td');
        score.textContent = chunk.score;
        tr.appendChild(score);
        // source url
        const link = document.createElement('td');
        tr.appendChild(link);
        if (chunk.source.url) {
            const a = document.createElement('a')
            a.textContent = 'voir';
            a.href = chunk.source.url;
            a.target = '_blank';
            link.appendChild(a);
        }
        filesTable.appendChild(tr);
    })
}




// ---------------------- //
// EVENT LISTENERS
// ---------------------- //



// --------------- Window

// On dragging the window
titleBar.addEventListener('mousedown', (downEvent) => {
    if (isAction(terminal)) return;
    terminal.dataset.isDragging = true;
    const offsetY = downEvent.clientY - terminal.offsetTop;
    const offsetX = downEvent.clientX - terminal.offsetLeft;

    document.addEventListener('mousemove', (e) => onMouseMove(e, terminal, offsetY, offsetX));
    document.addEventListener('mouseup', () => onMouseUp(terminal));
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
        case 'save-txt':
            button.onclick = () => downloadBotSession('txt');
            break
        case 'save-json':
            button.onclick = () => downloadBotSession('json');
            break
    }
});



// --------------- Chatbot

// On chatbot submit
chatbotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addMessage(input.value, 'you');
    queryBot(input.value).then(({ message, context }) => {
        if (message) {
            addMessage(message, 'marin', context);
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