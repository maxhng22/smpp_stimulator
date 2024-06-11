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
    // Your logic to get SMPP connection status
    const status = smppService.getConnectionStatus(); // Example

    res.status(200).json({ status });
};

module.exports = {
    sendMessage,
    getSMPPConnectionStatus
};
