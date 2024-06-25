const smpp = require('smpp');
const Config = require('../models/config'); // Assuming a Config model is defined
const logger = require('../utils/logger'); // Assuming logger is defined in your project

let smppClient; // Declare smppClient globally

// Connect to the SMPP server and initialize the session
exports.connect = async (host, port, systemId, password, systemType, version, mode) => {
    return new Promise((resolve, reject) => {
        try {
            smppClient = new smpp.Session({
                host: host,
                port: port,
                // tls: config.tls
            });

            smppClient.on('connect', () => {
                logger.info('Connected to SMPP server');

                // Determine bind mode
                let bindParams = {
                    system_id: systemId,
                    password: password,
                    system_type: systemType || '',
                    interface_version: version === '3.4' ? 0x34 : 0x33
                };

                let bindFunction;
                if (mode === 'txonly') {
                    bindFunction = smppClient.bind_transmitter.bind(smppClient);
                } else if (mode === 'rxonly') {
                    bindFunction = smppClient.bind_receiver.bind(smppClient);
                } else {
                    bindFunction = smppClient.bind_transceiver.bind(smppClient);
                }

                bindFunction(bindParams, (pdu) => {
                    logger.info('Successfully bound to the SMPP server rx now');
                    if (pdu.command_status === 0) {
                        logger.info('Successfully bound to the SMPP server');
                        resolve(smppClient); // Resolve the promise with the client
                    } else {
                        logger.error(`Failed to bind to SMPP server: ${pdu.command_status}`);
                        reject(new Error(`Failed to bind to SMPP server: ${pdu.command_status}`)); // Reject the promise with an error
                    }
                });
            });

            smppClient.on('error', (error) => {
                logger.error(`SMPP session error: ${error}`);
                reject(error); // Reject the promise with the error
            });

            smppClient.on('close', () => {
                logger.info('SMPP session closed');
            });
        } catch (error) {
            logger.error(`Failed to connect to SMPP server: ${error.message}`);
            reject(error); // Reject the promise with the error
        }
    });
};
// Send SMS using the established SMPP session
exports.sendSms = ( from, to, message) => {
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


