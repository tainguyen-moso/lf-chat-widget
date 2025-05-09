// Load XMPP client library
(function loadXMPP() {
  const script = document.createElement("script");
  script.src = "https://unpkg.com/@xmpp/client/dist/xmpp.min.js";
  script.crossOrigin = true;
  script.async = true;
  script.onload = () => {
    // Initialize widget after XMPP is loaded
    initializeWidget();
  };
  document.head.appendChild(script);
})();

// Chat Widget Configuration
const config = {
  apiDomain: "https://chat-admin.viet18.com/plugins/restapi/v1",
  hostName: "msg.viet18.com",
  xmppServer: "wss://msg.viet18.com:443/ws", // XMPP server
  domain: "viet18.com", // Domain XMPP
  widgetId: "lf-chat-widget",
  position: "bottom-right", // bottom-right, bottom-left, top-right, top-left
  primaryColor: "#4a90e2",
  secondaryColor: "#ffffff",
  title: "Live Chat Support",
  postFix: "@msg.viet18.com",
  historyLimit: 10, // Số lượng tin nhắn tối đa lấy từ lịch sử
};

let elements = null;
let xmppClient = null;
let clientUserName = null;
let clientOpenFireKey = null;
let supportJID = null;
let users = [];

// Create widget container
const createWidget = () => {
  const findChatId = document.getElementById("lf-chat-service");
  if (!findChatId) {
    return;
  }
  clientUserName = findChatId.getAttribute("client-chat-user-name");
  clientOpenFireKey = findChatId.getAttribute("open-fire-key");
  if (!clientUserName || !clientOpenFireKey) {
    return;
  }
  const widget = document.createElement("div");
  widget.id = config.widgetId;
  widget.style.cssText = `
        position: fixed;
        ${config.position.includes("bottom") ? "bottom: 20px" : "top: 20px"};
        ${config.position.includes("right") ? "right: 20px" : "left: 20px"};
        z-index: 9999;
        font-family: Arial, sans-serif;
    `;

  // Create chat button
  const chatButton = document.createElement("div");
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

  // Create user list window
  const userListWindow = document.createElement("div");
  userListWindow.style.cssText = `
        position: fixed;
        bottom: 70px;
        ${config.position.includes("right") ? "right: 20px" : "left: 20px"};
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
    `;

  // Create user list header
  const userListHeader = document.createElement("div");
  userListHeader.style.cssText = `
        padding: 15px;
        background-color: ${config.primaryColor};
        color: white;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;
  userListHeader.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 16px;">Select User to Chat</h3>
            <button id="close-user-list" style="background: none; border: none; color: white; cursor: pointer;">X</button>
        </div>
        <input type="text" id="user-search" placeholder="Search users..." style="
            width: 100%;
            box-sizing: border-box;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            outline: none;
            font-size: 14px;
            margin-top: 8px;
        ">
    `;

  // Create user list container
  const userListContainer = document.createElement("div");
  userListContainer.style.cssText = `
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        overflow-x: hidden;
        background-color: #f5f5f5;
    `;

  // Create chat window
  const chatWindow = document.createElement("div");
  chatWindow.style.cssText = `
        position: fixed;
        bottom: 70px;
        ${config.position.includes("right") ? "right: 20px" : "left: 20px"};
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
  const chatHeader = document.createElement("div");
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

  // Create loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.id = "loading-history";
  loadingIndicator.style.cssText = `
        text-align: center;
        padding: 10px;
        color: #666;
        display: none;
    `;
  loadingIndicator.textContent = "Loading message history...";

  // Create chat messages container
  const messagesContainer = document.createElement("div");
  messagesContainer.style.cssText = `
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        background-color: #f5f5f5;
    `;

  // Create history loader button (for loading more messages)
  const loadMoreButton = document.createElement("div");
  loadMoreButton.id = "load-more-messages";
  loadMoreButton.style.cssText = `
        text-align: center;
        padding: 10px;
        color: ${config.primaryColor};
        cursor: pointer;
        font-size: 12px;
        margin-bottom: 10px;
        display: none;
    `;
  loadMoreButton.textContent = "Load more messages";
  messagesContainer.appendChild(loadMoreButton);

  // Create chat input container
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = `
        padding: 15px;
        background-color: white;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
    `;

  const messageInput = document.createElement("input");
  messageInput.type = "text";
  messageInput.placeholder = "Type your message...";
  messageInput.style.cssText = `
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
    `;

  const sendButton = document.createElement("button");
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

  // add to DOM
  inputContainer.appendChild(messageInput);
  inputContainer.appendChild(sendButton);
  chatWindow.appendChild(chatHeader);
  chatWindow.appendChild(loadingIndicator);
  chatWindow.appendChild(messagesContainer);
  chatWindow.appendChild(inputContainer);
  userListWindow.appendChild(userListHeader);
  userListWindow.appendChild(userListContainer);
  widget.appendChild(chatButton);
  widget.appendChild(userListWindow);
  widget.appendChild(chatWindow);
  document.body.appendChild(widget);

  return {
    widget,
    chatButton,
    userListWindow,
    userListContainer,
    chatWindow,
    messagesContainer,
    messageInput,
    sendButton,
    closeButton: document.getElementById("close-chat"),
    closeUserListButton: document.getElementById("close-user-list"),
    loadingIndicator: document.getElementById("loading-history"),
    loadMoreButton: document.getElementById("load-more-messages"),
  };
};

// Initialize XMPP connection
const initializeXMPP = () => {
  // connect to XMPP
  const client = XMPP.client({
    service: config.xmppServer,
    domain: config.domain,
    username: clientUserName,
    password: clientOpenFireKey,
    resource: "webchat",
  });

  // handle message coming
  client.on("stanza", (stanza) => {
    if (stanza.is("message") && stanza.getChild("body")) {
      const from = stanza.attrs.from;
      const body = stanza.getChildText("body");

      // get only user message form user support
      if (from && from.includes(supportJID)) {
        addMessage(body, false, false);
      }
    }
  });

  client.on("online", async () => {
    console.log("XMPP connected successfully!");

    // Đăng ký presence để hiển thị trạng thái online
    const presence = XMPP.xml("presence");
    await client.send(presence);
  });

  client.on("error", (err) => {
    console.error("XMPP error:", err);
    client.stop();
  });

  try {
    client.start();
    return client;
  } catch (error) {
    client.stop();
    return null;
  }
};

// get all user to contact
const fetchAllContactUser = async (search) => {
  const params = new URLSearchParams();
  if (search) {
    params.append("search", search);
  }

  const res = await fetch(config.apiDomain + `/users?${params.toString()}`, {
    headers: {
      Authorization: "KisMJBa9pv2Q1QGUP6Eh329We4ubnzt36pFGNuAK",
      Accept: "application/json",
    },
  });
  const data = await res.json();
  if (data && data.users) {
    users = data;
  }
};

// get message history
const fetchMessageHistory = async (beforeId = null) => {
  console.log("supportJID", supportJID);
  if (!xmppClient) return;

  try {
    elements.loadingIndicator.style.display = "block";

    const queryId = `mam-query-${Date.now()}`;
    const mamQuery = XMPP.xml(
      "iq",
      { type: "set", id: queryId },
      XMPP.xml(
        "query",
        { xmlns: "urn:xmpp:mam:2", queryid: queryId },
        XMPP.xml("x", { xmlns: "jabber:x:data", type: "submit" }, [
          XMPP.xml(
            "field",
            { var: "FORM_TYPE", type: "hidden" },
            XMPP.xml("value", {}, "urn:xmpp:mam:2")
          ),
          // Filter messages with the support agent
          XMPP.xml("field", { var: "with" }, XMPP.xml("value", {}, supportJID)),
        ]),
        // RSM for pagination - load only the most recent messages
        XMPP.xml("set", { xmlns: "http://jabber.org/protocol/rsm" }, [
          XMPP.xml("max", {}, config.historyLimit.toString()),
          beforeId ? XMPP.xml("before", {}, beforeId) : XMPP.xml("before", {}),
        ])
      )
    );

    const messages = [];

    // handle message form MAM result
    const handleMAMResult = (stanza) => {
      if (!stanza.is("message")) return;

      const result = stanza.getChild("result", "urn:xmpp:mam:2");
      if (!result) return;

      const forwarded = result.getChild("forwarded", "urn:xmpp:forward:0");
      if (!forwarded) return;

      const message = forwarded.getChild("message");
      if (!message || !message.getChild("body")) return;

      const from = message.attrs.from;
      const body = message.getChildText("body");
      const delay = forwarded.getChild("delay", "urn:xmpp:delay");
      const timestamp = delay ? new Date(delay.attrs.stamp) : new Date();

      messages.push({
        id: result.attrs.id,
        from,
        body,
        timestamp,
        isUser: !from.includes(supportJID),
      });
    };

    // temp listener event message from MAM
    xmppClient.on("stanza", handleMAMResult);
    await xmppClient.send(mamQuery);

    // wait for message MAM
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // remove temp listener
    xmppClient.removeListener("stanza", handleMAMResult);

    // sort timestamp
    messages.sort((a, b) => b.timestamp - a.timestamp);

    let lastMessageId = null;
    if (messages.length > 0) {
      // first load message
      if (!beforeId) {
        elements.messagesContainer.innerHTML = "";
        elements.messagesContainer.appendChild(elements.loadMoreButton);
      }

      // render message
      messages.forEach((msg) => {
        addMessage(msg.body, msg.isUser, true, false);
        lastMessageId = msg.id;
      });

      // check is limit message
      if (messages.length >= config.historyLimit) {
        elements.loadMoreButton.style.display = "block";
        elements.loadMoreButton.onclick = () =>
          fetchMessageHistory(messages[0].id);
      } else {
        elements.loadMoreButton.style.display = "none";
      }
    } else if (!beforeId) {
      // is first dialog
      const welcomeDiv = document.createElement("div");
      welcomeDiv.style.cssText = `
                text-align: center;
                padding: 15px;
                color: #666;
            `;
      welcomeDiv.textContent = "Welcome to chat! No previous messages.";

      elements.messagesContainer.innerHTML = "";
      elements.messagesContainer.appendChild(welcomeDiv);
      elements.messagesContainer.appendChild(elements.loadMoreButton);
      elements.loadMoreButton.style.display = "none";
    } else {
      // no more history messages
      elements.loadMoreButton.style.display = "none";
    }

    // Scroll to end
    if (!beforeId) {
      elements.messagesContainer.scrollTop =
        elements.messagesContainer.scrollHeight;
    }

    elements.loadingIndicator.style.display = "none";
    return lastMessageId;
  } catch (error) {
    console.error("Error fetching message history:", error);
    elements.loadingIndicator.style.display = "none";
  }
};

// Add message to chat window
const addMessage = (text, isUser, isBefore, scroll = true) => {
  if (!elements) return;

  const messageElement = document.createElement("div");
  messageElement.style.cssText = `
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        align-items: ${isUser ? "flex-end" : "flex-start"};
    `;

  const messageBubble = document.createElement("div");
  messageBubble.style.cssText = `
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 15px;
        background-color: ${isUser ? config.primaryColor : "#e9ecef"};
        color: ${isUser ? "white" : "black"};
        word-break: break-word;
    `;
  messageBubble.textContent = text;

  messageElement.appendChild(messageBubble);

  if (isBefore) {
    elements.messagesContainer.insertBefore(
      messageElement,
      elements.loadMoreButton.nextSibling
    );
  } else {
    elements.messagesContainer.appendChild(messageElement);
  }

  if (scroll) {
    elements.messagesContainer.scrollTop =
      elements.messagesContainer.scrollHeight;
  }
};

// Send XMPP
const sendMessage = (text) => {
  if (!xmppClient || !text.trim()) return;

  const message = XMPP.xml(
    "message",
    {
      type: "chat",
      to: supportJID,
    },
    XMPP.xml("body", {}, text)
  );

  xmppClient.send(message).catch(console.error);
  addMessage(text, true, false);
};

// Initialize the widget
function initializeWidget() {
  elements = createWidget();
  if (!elements) return;

  xmppClient = initializeXMPP();

  if (!xmppClient) return;

  fetchAllContactUser();

  // Debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Function to render user list
  const renderUserList = (users) => {
    elements.userListContainer.innerHTML = "";
    if (users && users.users) {
      users.users.forEach((user) => {
        const userElement = document.createElement("div");
        userElement.style.cssText = `
          padding: 10px;
          margin: 5px 0;
          background-color: white;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          flex-direction: column;
          max-width: 100%;
          overflow: hidden;
        `;
        userElement.innerHTML = `
          <div style="font-weight: bold; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${user.username}
          </div>
          <div style="font-size: 12px; color: #666; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${user.name || ""}
          </div>
        `;
        userElement.addEventListener("click", () => {
          supportJID = user.username + config.postFix;
          elements.userListWindow.style.display = "none";
          elements.chatWindow.style.display = "flex";
          fetchMessageHistory();
        });
        elements.userListContainer.appendChild(userElement);
      });
    }
  };

  // Debounced search function
  const debouncedSearch = debounce(async (searchTerm) => {
    await fetchAllContactUser(searchTerm);
    renderUserList(users);
  }, 300);

  // Event listeners
  elements.chatButton.addEventListener("click", () => {
    elements.userListWindow.style.display = "flex";
    elements.chatButton.style.display = "none";
    renderUserList(users);
  });

  // Add search input event listener
  const searchInput = document.getElementById("user-search");
  searchInput.addEventListener("input", (e) => {
    debouncedSearch(e.target.value);
  });

  elements.closeUserListButton.addEventListener("click", () => {
    elements.userListWindow.style.display = "none";
    elements.chatButton.style.display = "flex";
    // Clear search input when closing
    searchInput.value = "";
  });

  elements.closeButton.addEventListener("click", () => {
    elements.chatWindow.style.display = "none";
    elements.chatButton.style.display = "flex";
  });

  elements.sendButton.addEventListener("click", () => {
    const message = elements.messageInput.value.trim();
    if (message) {
      sendMessage(message);
      elements.messageInput.value = "";
    }
  });

  elements.messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      elements.sendButton.click();
    }
  });
}
