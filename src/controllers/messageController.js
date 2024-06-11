const smppService = require('../services/smppService');
const logger = require('../utils/logger');

const sendMessage = (req, res) => {
    const { to, message } = req.body;
    const sysid = req.query.sysid || 'default_sysid';

    // Validate input
    if (!to || !message) {
        logger.error('Failed to send message: Invalid input');
        return res.status(400).json({ error: 'Invalid input. "to" and "message" are required.' });
    }

    // Apply pre-translation rule and send message
    smppService.sendSms(sysid, to, message);

    res.status(200).json({ success: true });
};

const getSMPPConnectionStatus = (req, res) => {
    // Implementation for getting SMPP connection status
    const status = smppService.getConnectionStatus();
    res.status(200).json({ status });
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
    sendMessage,
    getSMPPConnectionStatus,
    submitMessage // Export the new submitMessage function
};
