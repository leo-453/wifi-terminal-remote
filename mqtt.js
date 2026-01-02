// ---------------------------------------------------------
// Configurazione broker MQTT (WebSocket)
// ---------------------------------------------------------
const broker = "test.mosquitto.org";
const port = 8081;   // WebSocket MQTT

// Topic di annuncio
const announce_topic = "wifi_terminal/announce";

// Variabili dinamiche
let client = null;
let deviceID = null;
let deviceName = null;

let topic_pub = null;   // ESP → UI
let topic_sub = null;   // UI → ESP

let discoveredDevices = []; // lista dispositivi trovati


// ---------------------------------------------------------
// Connessione al broker MQTT
// ---------------------------------------------------------
function connectMQTT() {
    console.log("Connessione al broker MQTT...");

    client = new Paho.MQTT.Client(broker, port, "webclient_" + Math.random());

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    client.connect({
        onSuccess: onConnect,
        onFailure: onFail,
        useSSL: true
    });
}


// ---------------------------------------------------------
// Callback: connessione riuscita
// ---------------------------------------------------------
function onConnect() {
    console.log("Connesso al broker MQTT");
    document.getElementById("status").innerText = "connesso";

    // Ascolta gli annunci dei dispositivi
    client.subscribe(announce_topic);
    console.log("Sottoscritto a:", announce_topic);
}


// ---------------------------------------------------------
// Callback: connessione fallita
// ---------------------------------------------------------
function onFail(err) {
    console.error("Errore connessione:", err.errorMessage);
    document.getElementById("status").innerText = "errore";
}


// ---------------------------------------------------------
// Callback: connessione persa
// ---------------------------------------------------------
function onConnectionLost(responseObject) {
    console.error("Connessione persa:", responseObject.errorMessage);
    document.getElementById("status").innerText = "disconnesso";
}


// ---------------------------------------------------------
// Gestione messaggi MQTT
// ---------------------------------------------------------
function onMessageArrived(message) {
    const payload = message.payloadString;

    // ------------------------------
    // Annuncio dispositivo
    // ------------------------------
    if (message.destinationName === announce_topic &&
        payload.startsWith("HELLO:")) {

        const parts = payload.split(":");
        const id = parts[1];
        const name = parts[2] || "(senza nome)";

        // Evita duplicati
        if (!discoveredDevices.some(d => d.id === id)) {
            discoveredDevices.push({ id, name });
            aggiornaListaDispositivi();
        }

        console.log("Dispositivo rilevato:", name, id);
        return;
    }

    // ------------------------------
    // Messaggi dal dispositivo selezionato
    // ------------------------------
    if (message.destinationName === topic_pub) {
        console.log("RX:", payload);
        document.getElementById("lastMessage").innerText = payload;
    }
}


// ---------------------------------------------------------
// Aggiorna la lista dispositivi nella UI
// ---------------------------------------------------------
function aggiornaListaDispositivi() {
    const sel = document.getElementById("deviceList");
    sel.innerHTML = "";

    discoveredDevices.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = `${d.name} (${d.id})`;
        sel.appendChild(opt);
    });
}


// ---------------------------------------------------------
// Selezione dispositivo da UI
// ---------------------------------------------------------
function selezionaDispositivo() {
    const sel = document.getElementById("deviceList");
    deviceID = sel.value;

    const dev = discoveredDevices.find(d => d.id === deviceID);
    deviceName = dev.name;

    topic_pub = "wifi_terminal/" + deviceID + "/out";
    topic_sub = "wifi_terminal/" + deviceID + "/in";

    client.subscribe(topic_pub);

    console.log("Dispositivo selezionato:", deviceName, deviceID);
    document.getElementById("selectedDevice").innerText =
        `${deviceName} (${deviceID})`;
}


// ---------------------------------------------------------
// Invio messaggio al dispositivo
// ---------------------------------------------------------
function publishMessage() {
    let text = document.getElementById("msg").value;

    if (!text) {
        alert("Inserisci un messaggio");
        return;
    }

    if (!deviceID || !topic_sub) {
        alert("Nessun dispositivo selezionato!");
        return;
    }

    let message = new Paho.MQTT.Message(text);
    message.destinationName = topic_sub;

    client.send(message);

    console.log("TX su", topic_sub, ":", text);
}


// ---------------------------------------------------------
// Avvio automatico
// ---------------------------------------------------------
window.addEventListener("load", connectMQTT);
