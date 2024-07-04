const smppService = require('../services/smppService');
const logger = require('../utils/logger');
const smpp = require('smpp');
const Log = require('../models/log');

// let smppSession=null
const connectSMPP = async (req, res) => {
    const { host, port, systemId, password, systemType, version } = req.body;
    // Validate input
    if (!host || !port || !systemId || !password) {
        return res.status(400).json({ error: 'Invalid input. "host", "port", "systemId", and "password" are required.' });
    }
    try {
        smppSession = await smppService.connect(host, port, systemId, password, systemType, version,)
        res.status(200).json({ success: true, message: 'Connected and bound to SMPP server' });
    } catch (e) {

        res.status(500).json({ error: 'Failed to bind SMPP session', status: e })
        smppSession = null;
    }
    ;

    // smppSession.on('connect', () => {
    //     smppSession.bind_transceiver({
    //         system_id: systemId,
    //         password: password,
    //         system_type: systemType || '',
    //         interface_version: version || smpp.constants.VERSION_3_4
    //     }, (pdu) => {
    //         if (pdu.command_status === 0) {
    //             res.status(200).json({ success: true, message: 'Connected and bound to SMPP server' });
    //         } else {
    //             res.status(500).json({ error: 'Failed to bind SMPP session', status: pdu.command_status });
    //             smppSession.close();
    //             smppSession = null;
    //         }
    //     });
    // });

    // smppSession.on('close', () => {
    //     console.log('SMPP session closed');
    //     smppSession = null;
    // });

    // smppSession.on('error', (error) => {
    //     console.error('SMPP session error:', error);
    //     smppSession.close();
    //     smppSession = null;
    //     res.status(500).json({ error: 'SMPP session error', details: error });
    // });

};
const rxonlysmpp = async (req, res) => {
    const { host, port, systemId, password, systemType, version } = req.body;
    // Validate input
    if (!host || !port || !systemId || !password) {
        return res.status(400).json({ error: 'Invalid input. "host", "port", "systemId", and "password" are required.' });
    }
    try {
        smppSession = await smppService.connect(host, port, systemId, password, systemType, version, "rxonly")
        res.status(200).json({ success: true, message: 'Connected and bound to SMPP server' });
    } catch (e) {

        res.status(500).json({ error: 'Failed to bind SMPP session', status: e })
        smppSession = null;
    }
    ;
}

const txonlysmpp = async (req, res) => {
    const { host, port, systemId, password, systemType, version } = req.body;
    // Validate input
    if (!host || !port || !systemId || !password) {
        return res.status(400).json({ error: 'Invalid input. "host", "port", "systemId", and "password" are required.' });
    }
    try {
        smppSession = await smppService.connect(host, port, systemId, password, systemType, version, "txonly")
        res.status(200).json({ success: true, message: 'Connected and bound to SMPP server' });
    } catch (e) {

        res.status(500).json({ error: 'Failed to bind SMPP session', status: e })
        smppSession = null;
    }
    ;
}

const disconnectSMPP = (req, res) => {
    if (smppSession) {
        smppSession.unbind();
        smppSession = null;
        res.status(200).json({ success: true, message: 'Disconnected from SMPP server' });
    } else {
        res.status(400).json({ error: 'No active SMPP session to disconnect' });
    }
};
// source, destination,message ,registerDevivery
const sendMessage = (req, res) => {
    const { source, destination, message, registerDelivery } = req.body;
    // const sysid = req.query.sysid || 'default_sysid';

    // Validate input
    if (!source || !destination || !message) {
        logger.error('Failed to send message: Invalid input');
        return res.status(400).json({ error: 'Invalid input. "source", "destination", and "message" are required.' });
    }

    // Ensure registerDelivery is either 0 or 1
    const validRegisterDelivery = registerDelivery === '1' || registerDelivery === 1 ? 1 : 0;

    // Apply pre-translation rule and send message
    try {
        smppSession.submit_sm({
            source_addr: source,
            destination_addr: destination,
            short_message: message
        }, (pdu) => {
            if (pdu.command_status === 0) {
               const log= new Log({ source_address: source, destination_address: destination, message: message, status: "success" });
               log.save()
                logger.info('Message successfully sent');
                res.status(200).json({ success: true });
            } else {
                const log=  new Log({ source_address: source, destination_address: destination, message: message, status: "failed" });
                log.save()
                logger.error('Failed to send message:', pdu.command_status);
                throw (new Error('Failed to send message'));
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to send message', status: e })
    }


    // res.status(200).json({ success: true });
};

const loadTestSMPP = async (req, res) => {
    const { host, port, systemId, password, systemType, version, source, destination, message, numMessages, tps, binds, submitWindow } = req.body;
    // Validate input
    if (!host || !port || !systemId || !password) {
        return res.status(400).json({ error: 'Invalid input. "host", "port", "systemId", and "password" are required.' });
    }

    if (!source || !destination || !message || !numMessages) {
        return res.status(400).json({ error: 'Invalid input. "host", "port", "systemId", and "password" are required.' });
    }

    try {
        smppSession = await smppService.loadTest(host, port, systemId, password, systemType, version, source, destination, message, numMessages, tps, binds, submitWindow)
        console.log("success now")
        res.status(200).json({ success: true, message: smppSession });
    } catch (e) {

        res.status(500).json({ error: 'Failed to bind SMPP session', status: e })
        smppSession = null;
    }

    // res.status(200).json({ success: true });
};

const abortLoadTestSMPP = async (req, res) => {
    const { host, port, systemId, password, systemType, version, source, destination, message, numMessages, tps, binds, submitWindow } = req.body;
    // Validate input
    if (!host || !port || !systemId || !password) {
        return res.status(400).json({ error: 'Invalid input. "host", "port", "systemId", and "password" are required.' });
    }
    try {
        smppSession = await smppService.loadTest(host, port, systemId, password, systemType, version, source, destination, message, numMessages, tps, binds, submitWindow)
        console.log("success now")
        res.status(200).json({ success: true, message: smppSession });
    } catch (e) {

        res.status(500).json({ error: 'Failed to bind SMPP session', status: e })
        smppSession = null;
    }

    // res.status(200).json({ success: true });
};

const getSMPPConnectionStatus = (req, res) => {
    // Implementation for getting SMPP connection status
    const connection = smppService.getConnectionStatus();
    console.log(connection)
    // const status=[{"name":"testing"}]
    res.status(200).json([connection]);
};

// New submitMessage function
const submitMessage = (req, res) => {
    const {
        serviceType,
        esmClass,
        protocolId,
        priorityFlag,
        dataCoding,
        sourceAddress,
        destinationAddress,
        registeredDelivery,
        message
    } = req.body;

    // Validate input
    if (!sourceAddress || !destinationAddress || !message) {
        logger.error('Failed to submit message: Invalid input');
        return res.status(400).json({ error: 'Invalid input. "sourceAddress", "destinationAddress", and "message" are required.' });
    }

    // Process the message submission
    try {
        smppService.submitSms({
            serviceType,
            esmClass,
            protocolId,
            priorityFlag,
            dataCoding,
            sourceAddress,
            destinationAddress,
            registeredDelivery,
            message
        });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Failed to submit message', error);
        res.status(500).json({ error: 'Failed to submit message' });
    }
};

module.exports = {
    loadTestSMPP,
    abortLoadTestSMPP,
    rxonlysmpp,
    txonlysmpp,
    disconnectSMPP,
    connectSMPP,
    sendMessage,
    getSMPPConnectionStatus,
    submitMessage // Export the new submitMessage function
};
