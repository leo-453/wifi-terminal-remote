console.log("MQTT Remote Terminal loaded");

// -----------------------------
// BUFFER MESSAGGI + STORICO
// -----------------------------
let messageBuffer = [];
const MAX_MESSAGES = 20;

// Aggiunge un messaggio al buffer
function addMessage(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = timestamp + " → " + msg;

  messageBuffer.push(entry);

  if (messageBuffer.length > MAX_MESSAGES) {
    messageBuffer.shift();
  }

  updateMessageArea();
}

// Aggiorna la UI dello storico
function updateMessageArea() {
  const logDiv = document.getElementById("messageLog");
  if (!logDiv) return;

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
// LOG DISATTIVATO (non serve più)
// -----------------------------
function log(msg) {
  // finestra log rimossa
}

// -----------------------------
// INVIO MESSAGGI
// -----------------------------
function sendMessage() {
  const msg = document.getElementById("msg").value;

  if (!msg) return;

  // Il topic corretto è quello definito in mqtt.js
  if (window.topic_sub && window.client && window.client.connected) {
    client.publish(topic_sub, msg);
  }

  document.getElementById("msg").value = "";
  document.getElementById("msg").focus();
}

// Invio con tasto Invio
window.addEventListener("load", () => {
  const input = document.getElementById("msg");
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      sendMessage();
    }
  });
});

// -----------------------------
// ESPORTA FUNZIONI GLOBALI
// -----------------------------
window.addMessage = addMessage;
window.clearMessageLog = clearMessageLog;
window.sendMessage = sendMessage;
