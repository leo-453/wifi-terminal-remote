
let deviceID = null;
let topic_pub = null;   // ESP → GitHub
let topic_sub = null;   // GitHub → ESP

const announce_topic = "wifi_terminal/announce";

// ===============================
// CONFIGURAZIONE MQTT
// ===============================

// Broker pubblico Mosquitto (WebSocket)
const broker = "test.mosquitto.org";
const port = 8081;   // Porta WebSocket MQTT (non 1883)

// Topic definitivi


// ===============================
// CREAZIONE CLIENT MQTT
// ===============================

// ID univoco per evitare conflitti
let clientID = "webclient_" + Math.floor(Math.random() * 100000);

// Client Paho
let client = new Paho.MQTT.Client(broker, port, clientID);

// ===============================
// CALLBACKS
// ===============================

// Connessione persa
client.onConnectionLost = function(responseObject) {
    console.log("Connessione persa:", responseObject.errorMessage);
    document.getElementById("status").innerText = "disconnesso";
};

// Messaggio ricevuto
client.onMessageArrived = function(message) {
    const payload = message.payloadString;

    // Rilevamento automatico del dispositivo
    if (message.destinationName === announce_topic &&
        payload.startsWith("HELLO:")) {

        deviceID = payload.substring(6);  // estrae l'ID
        console.log("Dispositivo rilevato:", deviceID);

        // Costruzione dei topic personalizzati
        topic_pub = "wifi_terminal/" + deviceID + "/out";
        topic_sub = "wifi_terminal/" + deviceID + "/in";

        // Iscrizione al topic del dispositivo
        client.subscribe(topic_pub);

        // Aggiornamento UI
        document.getElementById("deviceIdLabel").innerText = deviceID;

        return;
    }

    // Gestione messaggi normali
    if (message.destinationName === topic_pub) {
        console.log("Messaggio dal dispositivo:", payload);
        document.getElementById("lastMessage").innerText = payload;
    }
};

// ===============================
// CONNESSIONE AL BROKER
// ===============================

function connectMQTT() {
    console.log("Connessione al broker MQTT...");

    client.connect({
        onSuccess: function() {
            console.log("Connesso al broker!");
            document.getElementById("status").innerText = "connesso";

            // Iscrizione al topic
            client.subscribe(announce_topic);
            console.log("Sottoscritto a:", announce_topic);
        },
        onFailure: function(err) {
            console.error("Errore connessione:", err.errorMessage);
            document.getElementById("status").innerText = "errore";
        },
        useSSL: true   // necessario per WebSocket su GitHub Pages
    });
}

// Avvio connessione
connectMQTT();

// ===============================
// PUBBLICAZIONE
// ===============================

function publishMessage() {
    let text = document.getElementById("msg").value;

    if (!text) {
        alert("Inserisci un messaggio");
        return;
    }

    // 1. Verifica che il dispositivo sia stato rilevato
    if (!deviceID) {
        alert("Nessun dispositivo rilevato! Attendi l'annuncio HELLO:<ID>.");
        return;
    }

    // 2. Verifica che il topic sia stato costruito
    if (!topic_sub) {
        alert("Topic non inizializzato. Attendi l'annuncio del dispositivo.");
        return;
    }

    // 3. Crea e invia il messaggio MQTT
    let message = new Paho.MQTT.Message(text);
    message.destinationName = topic_sub;

    client.send(message);

    console.log("Pubblicato su", topic_sub, ":", text);
}

