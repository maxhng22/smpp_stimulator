// src/services/smppService.js
const smpp = require('smpp');
const Config = require('../models/config'); // Assume a Config model is defined

let sessions = {}; // Store sessions per user

exports.connect = async (userId) => {
    try {
        const config = await Config.findOne(); // Fetch the SMPP configuration
        if (!config) {
            throw new Error('No SMPP configuration found');
        }

        const session = new smpp.Session({
            host: config.host,
            port: config.port,
            tls: config.tls
        });

        session.on('connect', () => {
            logger.info('Connected to SMPP server');
            session.bind_transceiver({
                system_id: config.system_id,
                password: config.password,
                system_type: config.system_type,
                interface_version: config.version === '3.4' ? 0x34 : 0x33 // Example for version mapping
            }, (pdu) => {
                if (pdu.command_status === 0) {
                    logger.info('Successfully bound to the SMPP server');
                } else {
                    logger.error(`Failed to bind to SMPP server: ${pdu.command_status}`);
                }
            });
        });

        session.on('error', (error) => {
            logger.error(`SMPP session error: ${error}`);
        });

        session.on('close', () => {
            logger.info('SMPP session closed');
        });

        return session;
    } catch (error) {
        logger.error(`Failed to connect to SMPP server: ${error.message}`);
    }
};

exports.sendSms = (userId, from, to, message) => {
    const session = sessions[userId];
    if (!session) {
        throw new Error('No active SMPP session');
    }

    return new Promise((resolve, reject) => {
        session.submit_sm({
            source_addr: from,
            destination_addr: to,
            short_message: message
        }, (pdu) => {
            if (pdu.command_status === 0) {
                console.log('Message successfully sent');
                resolve(true);
            } else {
                console.error('Failed to send message:', pdu.command_status);
                reject(new Error('Failed to send message'));
            }
        });
    });
};
