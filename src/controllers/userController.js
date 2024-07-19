const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Correct import of the User model
const logger = require('../utils/logger');

// Register function
exports.register = async (req, res) => {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const user = new User({ username, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        logger.error('Error registering user', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Login function
exports.login = async (req, res) => {
    const { username, password } = req.body;

    console.log("get request")
    // Input validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Find the user by username
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET , { expiresIn: '10h' });

        res.status(200).json({ token });
    } catch (error) {
        logger.error('Error logging in user', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
