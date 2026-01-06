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

    client = mqtt.connect(`wss://${broker}:${port}`);

    // Quando la connessione è stabilita
    client.on('connect', () => {
        console.log("Connesso al broker MQTT");
        document.getElementById("status").innerText = "connesso";

        client.subscribe(announce_topic);
        console.log("Sottoscritto a:", announce_topic);
    });

    // Quando arriva un messaggio
    client.on('message', (topic, payload) => {
        onMessageArrived(topic, payload.toString());
    });

    // Errori di connessione
    client.on('error', (err) => {
        console.error("Errore connessione:", err);
        document.getElementById("status").innerText = "errore";
    });

    // Disconnessione
    client.on('close', () => {
        console.warn("Connessione persa");
        document.getElementById("status").innerText = "disconnesso";
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
function onMessageArrived(topic, payload) {

    // Annuncio dispositivo
    if (topic === announce_topic && payload.startsWith("HELLO:")) {

        const parts = payload.split(":");
        const id = parts[1];
        const name = parts[2] || "(senza nome)";

        if (!discoveredDevices.some(d => d.id === id)) {
            discoveredDevices.push({ id, name });
            aggiornaListaDispositivi();
        }

        console.log("Dispositivo rilevato:", name, id);
        return;
    }

    // Messaggi dal dispositivo selezionato
    if (topic === topic_pub) {
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

    // ID del dispositivo = value dell'opzione selezionata
    deviceID = sel.value;

    // Se per qualche motivo non c'è valore, esci
    if (!deviceID) {
        console.warn("Nessun deviceID selezionato");
        document.getElementById("selectedDevice").innerText = "nessuno";
        return;
    }

    // Nome dispositivo = testo dell'opzione (prima della parentesi)
    const fullLabel = sel.options[sel.selectedIndex].textContent;  // es: "proto2 (966941)"
    deviceName = fullLabel.split(" (")[0];                         // -> "proto2"

    // Costruzione dei topic
    topic_pub = "wifi_terminal/" + deviceID + "/rx";  // ESP → UI
    topic_sub = "wifi_terminal/" + deviceID + "/tx";  // UI → ESP

    // Sottoscrizione al topic di ricezione
    client.subscribe(topic_pub);

    console.log("Dispositivo selezionato:", deviceName, deviceID);

    // Aggiornamento UI
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

    client.publish(topic_sub, text);
console.log("TX su", topic_sub, ":", text);


    console.log("TX su", topic_sub, ":", text);
}


// ---------------------------------------------------------
// Avvio automatico
// ---------------------------------------------------------
window.addEventListener("load", connectMQTT);
