import { rtdb } from "./rtdb";
import { ref, onValue, Unsubscribe } from "firebase/database";
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
      try {
        this.setState(JSON.parse(localData));
      } catch (e) {
        console.error("Invalid chat-state in localStorage", e);
        localStorage.removeItem("chat-state");
      }
    }
  },

  getState() {
    return this.data;
  },

  setState(newState: Partial<StateData>) {
    this.data = {
      ...this.data,
      ...newState,
      messages: Array.isArray(newState.messages)
        ? [...newState.messages]
        : Array.isArray(this.data.messages)
          ? [...this.data.messages]
          : [],
    };
    for (const cb of this.listeners) {
      cb();
    }
    localStorage.setItem("chat-state", JSON.stringify(this.data));
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
    this.setState({ ...cs, fullName: name });
  },

  setEmail(email: string) {
    const cs = this.getState();
    this.setState({ ...cs, email });
  },

  setRoomId(roomId: string) {
    const cs = this.getState();
    this.setState({ ...cs, roomId });
  },

  signIn(callback?: () => void) {
    const cs = this.getState();
    if (cs.email) {
      // Simple "auth" by email - in a real app we'd use Firebase Auth
      // For now, let's just generate a userId based on email or random if not exists
      // But actually, the requirements don't specify strict auth, just email/name.
      // We can store user info in RTDB /users if needed.
      const normalizedEmail = cs.email.trim().toLowerCase();
      const userId = btoa(normalizedEmail);
      this.setState({ ...cs, email: normalizedEmail, userId });
      if (callback) callback();
    } else {
      console.error("No email provided");
    }
  },

  askNewRoom(callback?: () => void) {
    const cs = this.getState();
    if (cs.userId) {
      fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: cs.userId }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error((data && data.error) || "Failed to create room");
          }
          const newRoomId = data && data.roomId;
          if (!newRoomId) {
            throw new Error("Failed to create room");
          }
          this.setState({ ...this.getState(), roomId: newRoomId });
          if (callback) callback();
        })
        .catch((e) => {
          console.error("Failed to create room", e);
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
    if (!roomId) {
      console.error("Missing roomId");
      return;
    }
    const roomRef = ref(rtdb, "/rooms/" + roomId);
    let isFirstCall = true;

    this.roomUnsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const currentState = this.getState();
        const rawMessages = data.messages || [];
        const nextMessages = (Array.isArray(rawMessages)
          ? rawMessages
          : (map(rawMessages) as Message[])
        )
          .filter((m) => m && typeof m.message === "string")
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        this.setState({ ...currentState, messages: nextMessages });
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
    if (!cs.roomId) {
      return Promise.reject(new Error("Missing roomId"));
    }
    if (!cs.fullName) {
      return Promise.reject(new Error("Missing fullName"));
    }
    return fetch(`/api/rooms/${cs.roomId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: cs.fullName, message }),
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data && data.error) || "Failed to send message");
      }
      return data;
    });
  }
};

export { state };