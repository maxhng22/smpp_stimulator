// src/controllers/configController.js
const Config = require('../models/config'); // Assume a Config model is defined

exports.saveConfig = async (req, res) => {
    const { userId } = req.user;
    const { host, port, system_id, password, system_type } = req.body;
    let config = await Config.findOne({ userId });
    if (!config) {
        config = new Config({ userId, host, port, system_id, password, system_type });
    } else {
        config.host = host;
        config.port = port;
        config.system_id = system_id;
        config.password = password;
        config.system_type = system_type;
    }
    await config.save();
    res.status(200).json({ message: 'Configuration saved successfully' });
};

exports.getConfig = async (req, res) => {
    const { userId } = req.user;
    const config = await Config.findOne({ userId });
    if (!config) {
        return res.status(404).json({ message: 'Configuration not found' });
    }
    res.status(200).json(config);
};


