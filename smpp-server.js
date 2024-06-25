const smpp = require('smpp');
const winston = require('winston');
const { MongoClient, ObjectId } = require('mongodb');
require("dotenv").config();

// MongoDB connection URI
const uri = process.env.MONGODB_URI;

// Configure winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'smpp-server.log' })
    ]
});

// Connect to MongoDB and retrieve configuration
async function getConfig() {
    // const client = new MongoClient(uri, {});
    // try {
    //     await client.connect();
    //     const database = client.db('smpp-client');
    //     const configs = database.collection('configs');
    //     const config = await configs.findOne({ _id: new ObjectId('66681890b4e905f89a8acfda') });
    //     return config;
    // } finally {
    //     await client.close();
    // }
}
const system_id="system"
const password="123456"
// Start the SMPP server
async function startSmppServer() {
    // const config = await getConfig();

    const server = smpp.createServer((session) => {
        logger.info('SMPP client connected');

        // Generic function to handle bind requests
        const handleBind = (pdu, sessionType) => {
            session.pause();
            logger.info(`Received ${sessionType}`);
            // Authenticate the client
            if (pdu.system_id === system_id && pdu.password === password) {
                logger.info('Client authenticated successfully');
                session.send(pdu.response());
            } else {
                logger.warn('Client authentication failed');
                session.send(pdu.response({ command_status: smpp.ESME_RINVPASWD }));
            }
            session.resume();
        };

        // Handle bind_transmitter (TX only)
        session.on('bind_transmitter', (pdu) => handleBind(pdu, 'bind_transmitter'));

        // Handle bind_receiver (RX only)
        session.on('bind_receiver', (pdu) => handleBind(pdu, 'bind_receiver'));

        // Handle bind_transceiver (both TX and RX)
        session.on('bind_transceiver', (pdu) => handleBind(pdu, 'bind_transceiver'));

        // Handle submit_sm (TX)
        session.on('submit_sm', (pdu) => {
            logger.info(`Received submit_sm: From ${pdu.source_addr} To ${pdu.destination_addr} Message ${pdu.short_message.message}`);
            // Send response
            session.send(pdu.response({
                message_id: '1'
            }));
        });

        // Handle deliver_sm (RX) - Example for receiving
        session.on('deliver_sm', (pdu) => {
            logger.info(`Received deliver_sm: From ${pdu.source_addr} To ${pdu.destination_addr} Message ${pdu.short_message.message}`);
            // Send response
            session.send(pdu.response());
        });

        // Handle unbind
        session.on('unbind', (pdu) => {
            logger.info('Received unbind');
            session.send(pdu.response());
            session.close();
        });

        // Handle unexpected errors
        session.on('error', (error) => {
            logger.error(`SMPP session error: ${error}`);
        });
    });

    server.listen(4002, "127.0.0.1", () => {
        logger.info(`SMPP server is listening on 127.0.0.1:${4002}`);
    });
}

// Call the function to start the server
startSmppServer().catch(err => logger.error(`Failed to start SMPP server: ${err}`));
