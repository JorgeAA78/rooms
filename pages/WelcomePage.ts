import { state } from "../src/state";
import { goTo } from "../src/router";

export function initWelcomePage(container: Element) {
    container.innerHTML = `
    <div class="header"></div>
    <div class="container">
        <h1 class="title">Bienvenidos</h1>
        
        <label class="label">email</label>
        <input type="email" class="input" name="email" placeholder="tu email">
        
        <label class="label">tu nombre</label>
        <input type="text" class="input" name="nombre" placeholder="tu nombre">
        
        <label class="label">room</label>
        <select class="select" name="room-select">
            <option value="new">Nuevo room</option>
            <option value="existing">Room existente</option>
        </select>
        
        <div id="room-id-container" style="display: none;">
            <label class="label">room id</label>
            <input type="text" class="input" name="room-id" placeholder="AXFTR1">
        </div>
        
        <button class="button">Comenzar</button>
    </div>
  `;

    const roomSelect = container.querySelector(".select") as HTMLSelectElement;
    const roomIdContainer = container.querySelector("#room-id-container") as HTMLElement;
    const button = container.querySelector(".button");

    roomSelect.addEventListener("change", (e) => {
        const target = e.target as HTMLSelectElement;
        if (target.value === "existing") {
            roomIdContainer.style.display = "block";
        } else {
            roomIdContainer.style.display = "none";
        }
    });

    button.addEventListener("click", () => {
        const email = (container.querySelector("input[name='email']") as HTMLInputElement).value;
        const nombre = (container.querySelector("input[name='nombre']") as HTMLInputElement).value;
        const roomOption = roomSelect.value;

        if (email && nombre) {
            state.setEmail(email);
            state.setFullName(nombre);
            state.signIn(() => {
                if (roomOption === "new") {
                    state.askNewRoom(() => {
                        const newRoomId = state.getState().roomId;
                        goTo("/chat", { room: newRoomId });
                    });
                } else {
                    const roomId = (container.querySelector("input[name='room-id']") as HTMLInputElement).value;
                    if (roomId) {
                        state.setRoomId(roomId);
                        state.accessToRoom(() => {
                            goTo("/chat", { room: roomId });
                        });
                    } else {
                        alert("Por favor ingresa un Room ID");
                    }
                }
            });
        } else {
            alert("Por favor completa todos los campos");
        }
    });

    return container;
}
