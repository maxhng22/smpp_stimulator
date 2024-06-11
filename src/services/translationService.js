const applyPreTranslationRule = (message) => {
    // Example: Convert message to uppercase
    return message.toUpperCase();
};

const applyPostTranslationRule = (message, status) => {
    // Example: Append status information to the message
    return `${message} (Status: ${status})`;
};

module.exports = {
    applyPreTranslationRule,
    applyPostTranslationRule
};
