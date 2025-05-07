// Load Socket.IO client library
(function loadSocketIO() {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
    script.async = true;
    script.onload = () => {
        // Initialize widget after Socket.IO is loaded
        initializeWidget();
    };
    document.head.appendChild(script);
})();

// Chat Widget Configuration
const config = {
    socketUrl: 'YOUR_SOCKET_SERVER_URL', // Replace with your Socket.IO server URL
    widgetId: 'lf-chat-widget',
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    primaryColor: '#4a90e2',
    secondaryColor: '#ffffff',
    title: 'Live Chat Support'
};

// Create widget container
const createWidget = () => {
    const findChatId = document.getElementById('lf-chat-service')
    if (!findChatId) {
        return;
    }
    const clinetChatId = findChatId.getAttribute('client-chat-id');
    if (!clinetChatId) {
        return;
    }
    const widget = document.createElement('div');
    widget.id = config.widgetId;
    widget.style.cssText = `
        position: fixed;
        ${config.position.includes('bottom') ? 'bottom: 20px' : 'top: 20px'};
        ${config.position.includes('right') ? 'right: 20px' : 'left: 20px'};
        z-index: 9999;
        font-family: Arial, sans-serif;
    `;

    // Create chat button
    const chatButton = document.createElement('div');
    chatButton.style.cssText = `
        width: 60px;
        height: 60px;
        background-color: ${config.primaryColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    `;
    chatButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    `;

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.style.cssText = `
        position: absolute;
        bottom: 70px;
        ${config.position.includes('right') ? 'right: 0' : 'left: 0'};
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
    `;

    // Create chat header
    const chatHeader = document.createElement('div');
    chatHeader.style.cssText = `
        padding: 15px;
        background-color: ${config.primaryColor};
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    chatHeader.innerHTML = `
        <h3 style="margin: 0; font-size: 16px;">${config.title}</h3>
        <button id="close-chat" style="background: none; border: none; color: white; cursor: pointer;">X</button>
    `;

    // Create chat messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.style.cssText = `
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        background-color: #f5f5f5;
    `;

    // Create chat input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
        padding: 15px;
        background-color: white;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
    `;

    const messageInput = document.createElement('input');
    messageInput.type = 'text';
    messageInput.placeholder = 'Type your message...';
    messageInput.style.cssText = `
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
    `;

    const sendButton = document.createElement('button');
    sendButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${config.primaryColor}" stroke-width="2">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
        </svg>
    `;
    sendButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
    `;

    // Assemble the widget
    inputContainer.appendChild(messageInput);
    inputContainer.appendChild(sendButton);
    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputContainer);
    widget.appendChild(chatButton);
    widget.appendChild(chatWindow);
    document.body.appendChild(widget);

    return {
        widget,
        chatButton,
        chatWindow,
        messagesContainer,
        messageInput,
        sendButton,
        closeButton: document.getElementById('close-chat')
    };
};

// Initialize Socket.IO connection
const initializeSocket = () => {
    const socket = io(config.socketUrl);
    
    socket.on('connect', () => {
        console.log('Connected to chat server');
    });

    socket.on('message', (message) => {
        addMessage(message, false);
    });

    return socket;
};

// Add message to chat window
const addMessage = (text, isUser = true) => {
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        align-items: ${isUser ? 'flex-end' : 'flex-start'};
    `;

    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 15px;
        background-color: ${isUser ? config.primaryColor : '#e9ecef'};
        color: ${isUser ? 'white' : 'black'};
    `;
    messageBubble.textContent = text;

    messageElement.appendChild(messageBubble);
    elements.messagesContainer.appendChild(messageElement);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
};

// Initialize the widget
function initializeWidget() {
    const elements = createWidget();
    const socket = initializeSocket();

    // Event listeners
    elements.chatButton.addEventListener('click', () => {
        elements.chatWindow.style.display = 'flex';
        elements.chatButton.style.display = 'none';
    });

    elements.closeButton.addEventListener('click', () => {
        elements.chatWindow.style.display = 'none';
        elements.chatButton.style.display = 'flex';
    });

    elements.sendButton.addEventListener('click', () => {
        const message = elements.messageInput.value.trim();
        if (message) {
            socket.emit('message', message);
            addMessage(message, true);
            elements.messageInput.value = '';
        }
    });

    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.sendButton.click();
        }
    });
} 