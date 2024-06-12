const smpp = require('smpp');
const Config = require('../models/config'); // Assuming a Config model is defined
const logger = require('../utils/logger'); // Assuming logger is defined in your project

let smppClient; // Declare smppClient globally

// Connect to the SMPP server and initialize the session
exports.connect = async (userId) => {
    try {
        const config = await Config.findOne(); // Fetch the SMPP configuration
        if (!config) {
            throw new Error('No SMPP configuration found');
        }

        smppClient = new smpp.Session({
            host: config.host,
            port: config.port,
            tls: config.tls
        });

        smppClient.on('connect', () => {
            logger.info('Connected to SMPP server');
            smppClient.bind_transceiver({
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

        smppClient.on('error', (error) => {
            logger.error(`SMPP session error: ${error}`);
        });

        smppClient.on('close', () => {
            logger.info('SMPP session closed');
        });

        return smppClient;
    } catch (error) {
        logger.error(`Failed to connect to SMPP server: ${error.message}`);
        throw error;
    }
};

// Send SMS using the established SMPP session
exports.sendSms = (userId, from, to, message) => {
    if (!smppClient) {
        throw new Error('No active SMPP session');
    }

    return new Promise((resolve, reject) => {
        smppClient.submit_sm({
            source_addr: from,
            destination_addr: to,
            short_message: message
        }, (pdu) => {
            if (pdu.command_status === 0) {
                logger.info('Message successfully sent');
                resolve(true);
            } else {
                logger.error('Failed to send message:', pdu.command_status);
                reject(new Error('Failed to send message'));
            }
        });
    });
};

// Get connection status
exports.getConnectionStatus = () => {
    // Implementation for getting SMPP connection status
};

// Submit SMS with specified parameters
exports.submitSms = ({ serviceType, esmClass, protocolId, priorityFlag, dataCoding, sourceAddress, destinationAddress, registeredDelivery, message }) => {
    if (!smppClient) {
        throw new Error('SMPP client is not initialized');
    }

    return new Promise((resolve, reject) => {
        smppClient.submit_sm({
            service_type: serviceType,
            source_addr: sourceAddress,
            dest_addr: destinationAddress,
            short_message: message,
            esm_class: esmClass,
            protocol_id: protocolId,
            priority_flag: priorityFlag,
            registered_delivery: registeredDelivery,
            data_coding: dataCoding
        }, (pdu) => {
            if (pdu.command_status == 0) {
                logger.info("Message submitted successfully");
                resolve(true);
            } else {
                logger.error("Failed to submit message", pdu);
                reject(new Error("Failed to submit message"));
            }
        });
    });
};


