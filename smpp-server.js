const smpp = require('smpp');
const winston = require('winston');

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

// Create an SMPP server
const server = smpp.createServer((session) => {
    logger.info('SMPP client connected');

    // Handle bind_transceiver
    session.on('bind_transceiver', (pdu) => {
        session.pause();
        logger.info('Received bind_transceiver');

        // Authenticate the client
        if (pdu.system_id === 'test' && pdu.password === 'password') {
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

// Start the server
server.listen(2775, () => {
    logger.info('SMPP server is listening on port 2775');
});
