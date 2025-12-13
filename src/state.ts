import { rtdb } from "./rtdb";
import { ref, onValue, push, set, Unsubscribe } from "firebase/database";
import map from "lodash/map";

interface Message {
  from: string;
  message: string;
  timestamp: number;
}

interface StateData {
  email: string;
  fullName: string;
  userId: string;
  roomId: string;
  messages: Message[];
}

const state = {
  data: {
    email: "",
    fullName: "",
    userId: "",
    roomId: "",
    messages: [],
  } as StateData,
  listeners: [] as Array<() => void>,
  roomUnsubscribe: null as Unsubscribe | null,

  init() {
    // Check for local storage?
    const localData = localStorage.getItem("chat-state");
    if (localData) {
      this.setState(JSON.parse(localData));
    }
  },

  getState() {
    return this.data;
  },

  setState(newState: StateData) {
    this.data = newState;
    for (const cb of this.listeners) {
      cb();
    }
    localStorage.setItem("chat-state", JSON.stringify(newState));
    console.log("State changed", this.data);
  },

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    // Retorna función para desuscribirse
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  },

  unsubscribeFromRoom() {
    if (this.roomUnsubscribe) {
      this.roomUnsubscribe();
      this.roomUnsubscribe = null;
    }
  },

  setFullName(name: string) {
    const cs = this.getState();
    cs.fullName = name;
    this.setState(cs);
  },

  setEmail(email: string) {
    const cs = this.getState();
    cs.email = email;
    this.setState(cs);
  },

  setRoomId(roomId: string) {
    const cs = this.getState();
    cs.roomId = roomId;
    this.setState(cs);
  },

  signIn(callback?: () => void) {
    const cs = this.getState();
    if (cs.email) {
      // Simple "auth" by email - in a real app we'd use Firebase Auth
      // For now, let's just generate a userId based on email or random if not exists
      // But actually, the requirements don't specify strict auth, just email/name.
      // We can store user info in RTDB /users if needed.
      cs.userId = btoa(cs.email); // Simple ID
      this.setState(cs);
      if (callback) callback();
    } else {
      console.error("No email provided");
    }
  },

  askNewRoom(callback?: () => void) {
    const cs = this.getState();
    if (cs.userId) {
      const roomsRef = ref(rtdb, "/rooms");
      const newRoomRef = push(roomsRef);
      const newRoomId = newRoomRef.key;

      cs.roomId = newRoomId || "";
      this.setState(cs);

      // Initialize room with owner
      set(newRoomRef, {
        owner: cs.userId,
        messages: []
      }).then(() => {
        if (callback) callback();
      });
    } else {
      console.error("User not authenticated");
    }
  },

  accessToRoom(callback?: () => void) {
    // Desuscribirse de room anterior si existe
    this.unsubscribeFromRoom();

    const cs = this.getState();
    const roomId = cs.roomId;
    const roomRef = ref(rtdb, "/rooms/" + roomId);
    let isFirstCall = true;

    this.roomUnsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const currentState = this.getState();
        currentState.messages = map(data.messages) as Message[];
        this.setState(currentState);
        // Solo ejecutar callback la primera vez
        if (callback && isFirstCall) {
          isFirstCall = false;
          callback();
        }
      } else {
        console.error("Room not found");
      }
    });
  },

  pushMessage(message: string) {
    const cs = this.getState();
    const messagesRef = ref(rtdb, "/rooms/" + cs.roomId + "/messages");
    push(messagesRef, {
      from: cs.fullName,
      message: message,
      timestamp: Date.now() // Use server timestamp ideally
    });
  }
};

export { state };