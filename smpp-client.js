const express = require('express');
const bodyParser = require('body-parser');
const smpp = require('smpp');
const winston = require('winston');
const cors = require('cors');
const app = express();
app.use(bodyParser.json());
app.use(cors());

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
        new winston.transports.File({ filename: 'smpp-client.log' })
    ]
});

// Create an SMPP session
const session = new smpp.Session({ host: 'localhost', port: 2775 });

session.on('connect', () => {
    logger.info('Connected to SMPP server');

    // Bind to the server
    session.bind_transceiver({
        system_id: 'test',
        password: 'password'
    }, (pdu) => {
        if (pdu.command_status === 0) {
            logger.info('Successfully bound to the SMPP server');

            // Send an SMS (for testing)
            sendSms('test', '5678', 'Hello, world!');
        } else {
            logger.error(`Failed to bind to SMPP server: ${pdu.command_status}`);
        }
    });
});

session.on('error', (error) => {
    logger.error(`SMPP session error: ${error}`);
});

// Function to apply pre-translation rule
const applyPreTranslationRule = (message) => {
    // Example: Convert message to uppercase
    return message.toUpperCase();
};

// Function to apply post-translation rule
const applyPostTranslationRule = (message, status) => {
    // Example: Append status information to the message
    return `${message} (Status: ${status})`;
};

// Function to send SMS
const sendSms = (sysid, to, message) => {
    const transformedMessage = applyPreTranslationRule(message);

    session.submit_sm({
        source_addr: sysid,
        destination_addr: to,
        short_message: transformedMessage
    }, (pdu) => {
        let finalMessage = transformedMessage;
        if (pdu.command_status === 0) {
            finalMessage = applyPostTranslationRule(transformedMessage, 'Sent');
            logger.info(`Message successfully sent to ${to}: ${finalMessage}`);
        } else {
            finalMessage = applyPostTranslationRule(transformedMessage, `Failed (${pdu.command_status})`);
            logger.error(`Failed to send message to ${to}: ${finalMessage}`);
        }
    });
};

app.post('/api/send-message', (req, res) => {
    const { to, message } = req.body;
    const sysid = req.query.sysid || 'default_sysid';  // Default system_id if not provided

    // Validate input
    if (!to || !message) {
        logger.error('Failed to send message: Invalid input');
        return res.status(400).json({ error: 'Invalid input. "to" and "message" are required.' });
    }

    // Apply pre-translation rule and send message
    sendSms(sysid, to, message);

    res.status(200).json({ success: true });
});

app.post('/api/updateconfiguration', (req, res) => {
    console.log('Request body:', req.body);
    // Validate input
    res.status(200).json({ success: true });
});

app.get('/api/smppConnection', (req, res) => {
    console.log('Request body:', req.body);
    // Validate input
    res.status(200).json({
        data: [
            { id: 1000, name: 'SMPP', date: '2019-02-09', status: 'up' },
            { id: 1002, name: 'SMPP-OLD', date: '2019-02-09', status: 'down' }
        ],
        success: true
    });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
