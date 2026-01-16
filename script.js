console.log("MQTT Remote Terminal loaded");

let client = null;

// Inserisci qui i dati della tua istanza HiveMQ 
const MQTT_HOST = "wss://e46684488ad3440aa9f0b18d79db6b87.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "leo453"; 
const MQTT_PASS = "<bsfg805NG>";


// -----------------------------
// BUFFER MESSAGGI + STORICO
// -----------------------------
let messageBuffer = [];
const MAX_MESSAGES = 20;

// Aggiunge un messaggio al buffer
function addMessage(msg) {
  //const timestamp = new Date().toLocaleTimeString();
  //const entry = timestamp + " → " + msg;

  messageBuffer.push(entry);

  if (messageBuffer.length > MAX_MESSAGES) {
    messageBuffer.shift();
  }

  updateMessageArea();
}

// Aggiorna la UI dello storico
function updateMessageArea() {
  const logDiv = document.getElementById("messageLog");
  if (!logDiv) return; // sicurezza

  logDiv.textContent = messageBuffer.join("\n");
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Pulsante "Elimina Storico"
function clearMessageLog() {
  if (!confirm("Vuoi davvero eliminare lo storico dei messaggi?")) return;

  messageBuffer = [];
  updateMessageArea();
}



// -----------------------------
// LOG ORIGINALE (rimane invariato)
// -----------------------------
function log(msg) {
  const box = document.getElementById("log");
  box.innerHTML += msg + "<br>";
  box.scrollTop = box.scrollHeight;
}



// -----------------------------
// CONNESSIONE MQTT
// -----------------------------
function connectMQTT() {
  log("Connecting to HiveMQ Cloud...");
  
  client = mqtt.connect(MQTT_HOST, { 
    username: MQTT_USER, 
    password: MQTT_PASS, 
    reconnectPeriod: 2000,
  });

  client.on("connect", () => {
    document.getElementById("status").textContent = "Connected";
    document.getElementById("status").style.color = "green";
    log("Connected to HiveMQ Cloud");
  });

  client.on("message", (topic, message) => {
    const msg = message.toString();

    // Log classico
    log("[RECV] " + topic + ": " + msg);

    // Aggiorna "Ultimo messaggio"
    const lastMsgBox = document.getElementById("lastMessage");
    if (lastMsgBox) lastMsgBox.textContent = msg;

    // Aggiungi allo storico
    addMessage(msg);
  });

  client.on("error", (err) => {
    log("Error: " + err);
  });
}



// -----------------------------
// INVIO MESSAGGI
// -----------------------------
function sendMessage() {
  const topic = document.getElementById("topic").value;
  const msg = document.getElementById("message").value;

  if (client && client.connected) {
    client.publish(topic, msg);
    log("[SEND] " + topic + ": " + msg);
  } else {
    log("Not connected");
  }
}

document.getElementById("message").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    sendMessage();
  }
});

window.onload = connectMQTT;
