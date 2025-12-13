import { state } from "../src/state";
import { getQueryParam, goTo } from "../src/router";

export function initChatPage(container: Element) {
    // Leer roomId de la URL si existe
    const roomIdFromUrl = getQueryParam("room");
    
    // Si hay roomId en URL pero no en state, configurarlo
    if (roomIdFromUrl && state.getState().roomId !== roomIdFromUrl) {
        state.setRoomId(roomIdFromUrl);
    }
    
    // Si no hay roomId ni en URL ni en state, redirigir a welcome
    const currentRoomId = state.getState().roomId;
    if (!currentRoomId) {
        goTo("/welcome");
        return;
    }

    container.innerHTML = `
    <div class="header"></div>
    <div class="container chat-container">
        <div class="chat-header">
            <h1 class="chat-title">Chat</h1>
            <span class="room-id">room id: ${currentRoomId}</span>
        </div>
        
        <div class="messages">
            <!-- Messages will be rendered here -->
        </div>
        
        <form class="chat-form">
            <input type="text" class="input" name="message" placeholder="Enviar mensaje...">
            <button class="button">Enviar</button>
        </form>
    </div>
  `;

    const messagesContainer = container.querySelector(".messages");
    const form = container.querySelector(".chat-form");

    function renderMessages() {
        const currentState = state.getState();
        const messages = currentState.messages || [];

        messagesContainer.innerHTML = "";

        messages.forEach(msg => {
            const div = document.createElement("div");
            const isMyMessage = msg.from === currentState.fullName;

            div.classList.add("message");
            div.classList.add(isMyMessage ? "my-message" : "other-message");

            div.innerHTML = `
            <span class="message-sender">${msg.from}</span>
            <span class="message-content">${msg.message}</span>
          `;

            messagesContainer.appendChild(div);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    state.subscribe(() => {
        renderMessages();
    });

    // Initial render
    renderMessages();
    // Ensure we are listening to room updates
    state.accessToRoom();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = form.querySelector("input[name='message']") as HTMLInputElement;
        const message = input.value;

        if (message) {
            state.pushMessage(message);
            input.value = "";
        }
    });

    return container;
}
