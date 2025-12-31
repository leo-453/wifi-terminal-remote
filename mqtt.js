// ===============================
// CONFIGURAZIONE MQTT
// ===============================

// Broker pubblico Mosquitto (WebSocket)
const broker = "test.mosquitto.org";
const port = 8081;   // Porta WebSocket MQTT (non 1883)

// Topic definitivi
const topic_pub = "wifi_terminal/test/out";
const topic_sub = "wifi_terminal/test/in";

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
    console.log("Messaggio arrivato:", message.payloadString);

    document.getElementById("received").innerText =
        "Topic: " + message.destinationName + "\n" +
        "Payload: " + message.payloadString;
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
            client.subscribe(topic_sub);
            console.log("Sottoscritto a:", topic_sub);
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

    let message = new Paho.MQTT.Message(text);
    message.destinationName = topic_pub;

    client.send(message);

    console.log("Pubblicato:", text);
}
 
