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
    const client = new MongoClient(uri, {});
    try {
        await client.connect();
        const database = client.db('smpp-client');
        const configs = database.collection('configs');
        const config = await configs.findOne({ _id: new ObjectId('66681890b4e905f89a8acfda') });
        return config;
    } finally {
        await client.close();
    }
}

// Start the SMPP server
async function startSmppServer() {
    const config = await getConfig();

    const server = smpp.createServer((session) => {
        logger.info('SMPP client connected');

        // Handle bind_transceiver
        session.on('bind_transceiver', (pdu) => {
            session.pause();
            logger.info('Received bind_transceiver');

            // Authenticate the client
            if (pdu.system_id === config.system_id && pdu.password === config.password) {
                logger.info('Client authenticated successfully');
                session.send(pdu.response());
            } else {
                logger.warn('Client authentication failed');
                session.send(pdu.response({ command_status: smpp.ESME_RINVPASWD }));
            }

            session.resume();
        });

        // Handle submit_sm
        session.on('submit_sm', (pdu) => {
            logger.info(`Received submit_sm: From ${pdu.source_addr} To ${pdu.destination_addr} Message ${pdu.short_message.message}`);

            // Send response
            session.send(pdu.response({
                message_id: '1'
            }));
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

    server.listen(config.port, config.host, () => {
        logger.info(`SMPP server is listening on ${config.host}:${config.port}`);
    });
}

// Call the function to start the server
startSmppServer().catch(err => logger.error(`Failed to start SMPP server: ${err}`));
