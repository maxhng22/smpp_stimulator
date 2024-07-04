const Log = require('../models/log');

const getAllLogs = async (req, res) => {
    try {
        const logs = await Log.find();
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};

module.exports = {
    getAllLogs
};