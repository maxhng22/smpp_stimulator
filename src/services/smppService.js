const smpp = require('smpp');
const { performance } = require('perf_hooks');
const Config = require('../models/config'); // Assuming a Config model is defined
const logger = require('../utils/logger'); // Assuming logger is defined in your project
const { version } = require('os');
const iconv = require('iconv-lite');

let smppClient; // Declare smppClient globally
let connectionStatus = 'disconnected';
let nameSMPP = 'localhost';
let system = ""
let smppversion = ""
// Connect to the SMPP server and initialize the session
exports.connect = async (host, port, systemId, password, systemType, version, mode) => {
    return new Promise((resolve, reject) => {
        try {
            nameSMPP = host + ":" + port
            system = systemId
            smppversion = version
            smppClient = new smpp.Session({
                host: host,
                port: port,
                // tls: config.tls
            });

            smppClient.on('connect', () => {

                logger.info('Connected to SMPP server');

                // smppClient.bind_transceiver({
                //     system_id: systemId,
                //     password: password||"",
                //     system_type: '',
                //     interface_version: 0x34
                // }, (pdu) => {
                //     if (pdu.command_status === 0) {
                //         console.log('Successfully bound to SMPP server');

                //         smppClient.submit_sm({
                //             source_addr: "21321",
                //             destination_addr: "213213",
                //             short_message: "message"
                //         }, (pdu) => {
                //             console.log("here")
                //             if (pdu.command_status === 0) {
                //                 // const log = new Log({ source_address: source, destination_address: destination, message: message, status: "success" });
                //                 // log.save()
                //                 logger.info('Message successfully sent');
                //                 // res.status(200).json({ success: true });
                //             } else {
                //                 // const log = new Log({ source_address: source, destination_address: destination, message: message, status: "failed" });
                //                 // log.save()
                //                 logger.error('Failed to send message:', pdu.command_status);
                //                 throw (new Error('Failed to send message'));
                //             }
                //         });
                //         // sendMessage();
                //     } else {
                //         console.error(`Failed to bind to SMPP server: ${pdu.command_status}`);
                //     }
                // });

                // Determine bind mode
                let bindParams = {
                    system_id: systemId,
                    password: password || "",
                    system_type: systemType || '',
                    interface_version: "0x34"
                };

                let bindFunction;
                if (mode === 'txonly') {
                    bindFunction = smppClient.bind_transmitter.bind(smppClient);
                } else if (mode === 'rxonly') {
                    bindFunction = smppClient.bind_transceiver.bind(smppClient);
                } else {
                    bindFunction = smppClient.bind_transceiver.bind(smppClient);
                }

                bindFunction(bindParams, (pdu) => {
                    // smppClient.unbind((unbindPdu) => {
                    //     if (unbindPdu.command_status === 0) {
                    //         console.log('Successfully unbound from SMPP server');
                    //     } else {
                    //         console.error('Failed to unbind from SMPP server:', unbindPdu.command_status);
                    //     }

                    //     // Close the session
                    //     smppClient.close();
                    // });
                    if (pdu.command_status === 0) {
                        connectionStatus = 'connected';
                        logger.info('Successfully bound to the SMPP server');
                        resolve(smppClient); // Resolve the promise with the client
                    } else {
                        connectionStatus = 'error';

                        logger.error(`Failed to bind to SMPP server: ${pdu.command_status}`);
                        reject(new Error(`Failed to bind to SMPP server: ${pdu.command_status}`)); // Reject the promise with an error
                    }
                });
            });

            smppClient.on('deliver_sm', (pdu) => {
                const message = pdu.short_message.message;
                const sourceAddr = pdu.source_addr;
                const destinationAddr = pdu.destination_addr;

                console.log('Received message:', message);
                console.log('From:', sourceAddr);
                console.log('To:', destinationAddr);

                // Acknowledge the delivery
                smppClient.send(pdu.response());
            });

            smppClient.on('error', (error) => {
                logger.error(`SMPP session error: ${error}`);
                connectionStatus = 'error';
                reject(error); // Reject the promise with the error
            });

            smppClient.on('close', (e) => {
                connectionStatus = 'disconnected';
                logger.info('SMPP session closed');
            });

            smppClient.on('pdu', (pdu) => {
                console.log(`Received PDU: ${JSON.stringify(pdu)}`);
            });
        } catch (error) {
            connectionStatus = 'failed_to_connect';
            logger.error(`Failed to connect to SMPP server: ${error.message}`);
            reject(error); // Reject the promise with the error
        }
    });
};
// Send SMS using the established SMPP session
exports.sendSms = (from, to, message) => {
    // if (!smppClient) {
    //     throw new Error('No active SMPP session');
    // }

    return new Promise((resolve, reject) => {
        let encoding;
        let shortMessages;

        // Determine encoding based on message content
        if (isChinese(message)) {
            encoding = 8; // UCS2 encoding for Chinese characters
            shortMessages = splitMessage(message, 140); // Split into UCS2 segments
        } else {
            encoding = 0; // Default GSM 7-bit encoding for English
            shortMessages = splitMessage(message, 160); // Split into GSM 7-bit segments
        }

        console.log(shortMessages)
        // Submit each segment of the message
        const promises = shortMessages.map((shortMessage, index) => {
            return new Promise((resolveSegment, rejectSegment) => {
                console.log(shortMessage)
                smppClient.submit_sm({
                    source_addr: from,
                    destination_addr: to,
                    short_message: shortMessage,
                    // data_coding: encoding,
                    // esm_class: 0x40, // Indicate that the message is part of a concatenated sequence
                    // sequence_number: index + 1 // Set the sequence number for each segment
                }, (pdu) => {
                    if (pdu.command_status === 0) {
                        logger.info(`Segment ${index + 1} of ${shortMessages.length} sent successfully`);
                        resolveSegment(true);
                    } else {
                        logger.error(`Failed to send segment ${index + 1} of ${shortMessages.length}:`, pdu.command_status);
                        rejectSegment(new Error(`Failed to send segment ${index + 1}`));
                    }
                });
            });
        });

        // Resolve when all segments are sent successfully
        Promise.all(promises)
            .then(() => resolve(true))
            .catch(error => reject(error));
    });
};

function isChinese(text) {
    // Check if the text contains Chinese characters
    const chineseRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;
    return chineseRegex.test(text);
}

function splitMessage(message, maxLength) {
    const segments = [];
    let currentPosition = 0;

    while (currentPosition < message.length) {
        segments.push(message.substring(currentPosition, currentPosition + maxLength));
        currentPosition += maxLength;
    }

    return segments;
}



// Get connection status
exports.getConnectionStatus = () => {
    return { "status": connectionStatus, "name": nameSMPP, "systemId": system, "version": smppversion };
};

// Submit SMS with specified parameters
exports.loadTest = async (host, port, systemId, password, systemType, version, source, destination, message, numMessages, tps, binds, submitWindow) => {
    return new Promise((resolve, reject) => {
        const smppClient = new smpp.Session({
            host: host,
            port: port,
        });

        console.log(tps)
        let totalLatency = 0;
        let successfulSubmissions = 0;
        const latencyArray = [];
        const messagesPerSecondObject = {};
        let messagesSentInCurrentSecond = 0;
        let startTimeOfCurrentSecond = performance.now();

        smppClient.on('connect', () => {
            logger.info('Connected to SMPP server');

            smppClient.bind_transceiver({
                system_id: systemId,
                password: password || "",
                system_type: systemType || "",
                interface_version: version || "0x34"
            }, (pdu) => {
                if (pdu.command_status === 0) {
                    logger.info('Successfully bound to the SMPP server');
                    startSendingMessages();
                } else {
                    logger.error(`Failed to bind to SMPP server: ${pdu.command_status}`);
                    smppClient.close();
                    reject(new Error(`Failed to bind to SMPP server: ${pdu.command_status}`));
                }
            });
        });

        smppClient.on('deliver_sm', (pdu) => {
            const message = pdu.short_message.message;
            const sourceAddr = pdu.source_addr;
            const destinationAddr = pdu.destination_addr;

            console.log('Received message:', message);
            console.log('From:', sourceAddr);
            console.log('To:', destinationAddr);

            // Acknowledge the delivery
            smppClient.send(pdu.response());
        });

        smppClient.on('error', (error) => {
            logger.error(`SMPP session error: ${error}`);
            reject(error); // Reject the promise with the error
        });

        smppClient.on('close', (e) => {
            logger.info('SMPP session closed');
        });

        smppClient.on('pdu', (pdu) => {
            // console.log(`Received PDU: ${JSON.stringify(pdu)}`);
        });

        let messagesPerSecondArray2 = {}
        function startSendingMessages() {
            let messagesSent = 0;
            // let count = 0;
            let startTime2 = null;
            // const start = performance.now();
            const intervalId = setInterval(() => {
                // count++;
                // const now = performance.now();
                // if (now - start >= 1000) {
                //     console.log(`Ran ${count} times in ${now - start} second`);
                // }
                if (messagesSent >= numMessages) {
                    clearInterval(intervalId);
                    smppClient.unbind();
                    const endTime = performance.now();
                    const totalTime = endTime - startTime2
                    // console.log(totalTime)
                    let messagesPerSecondArray = [];
                    for (let j in messagesPerSecondObject) {
                        messagesPerSecondArray.push(messagesPerSecondObject[j]);
                    }

                    resolve({ totalLatency, successfulSubmissions, latencyArray, messagesPerSecondArray, totalTime });
                    return;
                }

                if (!startTime2) { // Check if start time is not set yet
                    startTime2 = performance.now();
                }

                const startTime = performance.now();
                const currentSecond2 = Math.floor((performance.now() - startTimeOfCurrentSecond) / 1000);
                if (messagesPerSecondArray2[currentSecond2] !== undefined) {
                    messagesPerSecondArray2[currentSecond2]++;
                } else {
                    messagesPerSecondArray2[currentSecond2] = 1;
                }
                // messagesSent++;
                smppClient.submit_sm({
                    source_addr: source,
                    destination_addr: destination,
                    short_message: message
                }, (pdu) => {
                    const endTime = performance.now();
                    const latency = endTime - startTime;
                    totalLatency += latency;
                    latencyArray.push(latency);

                    if (pdu.command_status === 0) {
                        successfulSubmissions++;
                        const currentSecond = Math.floor((performance.now() - startTimeOfCurrentSecond) / 1000);
                        if (messagesPerSecondObject[currentSecond] !== undefined) {
                            messagesPerSecondObject[currentSecond]++;
                        } else {
                            messagesPerSecondObject[currentSecond] = 1;
                        }
                        messagesSentInCurrentSecond++;
                    } else {
                        logger.warn(`Message submission failed: ${pdu.command_status}`);
                    }

                    messagesSent++;
                });
            }, 1000 / tps);
        }
    });
};

exports.loadTest2 = async (host, port, systemId, password, systemType, version, source, destination, message, numMessages, tps, binds, submitWindow) => {
    return new Promise((resolve, reject) => {
        const smppClient = new smpp.Session({
            host: host,
            port: port,
        });

        let totalLatency = 0;
        let successfulSubmissions = 0;
        const latencyArray = [];
        const messagesPerSecondObject = {};
        let messagesSentInCurrentSecond = 0;
        let startTimeOfCurrentSecond = performance.now();

        smppClient.on('connect', () => {
            logger.info('Connected to SMPP server');

            smppClient.bind_transceiver({
                system_id: systemId,
                password: password || "",
                system_type: systemType || "",
                interface_version: version || "0x34"
            }, (pdu) => {
                if (pdu.command_status === 0) {
                    logger.info('Successfully bound to the SMPP server');
                    startSendingMessages();
                } else {
                    logger.error(`Failed to bind to SMPP server: ${pdu.command_status}`);
                    smppClient.close();
                    reject(new Error(`Failed to bind to SMPP server: ${pdu.command_status}`));
                }
            });
        });

        smppClient.on('deliver_sm', (pdu) => {
            const message = pdu.short_message.message;
            const sourceAddr = pdu.source_addr;
            const destinationAddr = pdu.destination_addr;

            console.log('Received message:', message);
            console.log('From:', sourceAddr);
            console.log('To:', destinationAddr);

            // Acknowledge the delivery
            smppClient.send(pdu.response());
        });

        smppClient.on('error', (error) => {
            logger.error(`SMPP session error: ${error}`);
            reject(error); // Reject the promise with the error
        });

        smppClient.on('close', (e) => {
            logger.info('SMPP session closed');
        });

        smppClient.on('pdu', (pdu) => {
            // console.log(`Received PDU: ${JSON.stringify(pdu)}`);
        });

        // let messagesPerSecondArray2 = {}
        function startSendingMessages() {
            let messagesSent = 0;
            let startTime2 = null;
            const intervalId = setInterval(() => {

                if (messagesSent >= numMessages) {
                    clearInterval(intervalId);
                    smppClient.unbind();
                    const endTime = performance.now();
                    const totalTime = endTime - startTime2
                    // console.log(totalTime)
                    let messagesPerSecondArray = [];
                    for (let j in messagesPerSecondObject) {
                        messagesPerSecondArray.push(messagesPerSecondObject[j]);
                    }

                    resolve({ totalLatency, successfulSubmissions, latencyArray, messagesPerSecondArray, totalTime });
                    return;
                }

                if (!startTime2) { // Check if start time is not set yet
                    startTime2 = performance.now();
                }

                let startTime = performance.now();
                // const currentSecond2 = Math.floor((performance.now() - startTimeOfCurrentSecond) / 1000);
                // if (messagesPerSecondArray2[currentSecond2] !== undefined) {
                //     messagesPerSecondArray2[currentSecond2]++;
                // } else {
                //     messagesPerSecondArray2[currentSecond2] = 1;
                // }
                // messagesSent++;
                console.log(messagesSent)
                const promises = [];
                for (let i = 1; i <= tps; i++) {
                    promises.push(createSubmitSmPromise(i,destination,source,message,smppClient).then(() => {

                        // messagesSent++
                    })
                    .catch((error) => {
                        console.error(error);
                        // messagesSent++
                    }));
                }
        
                // Send all messages concurrently
                Promise.all(promises)
                    .then(() => {
                        const endTime = performance.now();
                        const latency = endTime - startTime;
                        totalLatency += latency;
                        latencyArray.push(latency);
                        // console.log('All messages sent successfully');

                        const currentSecond = Math.floor((performance.now() - startTimeOfCurrentSecond) / 1000);
                        if (messagesPerSecondObject[currentSecond] !== undefined) {
                            messagesPerSecondObject[currentSecond]=+tps;
                        } else {
                            messagesPerSecondObject[currentSecond] = tps;
                        }
                        // messagesSentInCurrentSecond++;
                        // session.unbind(); // Unbind from the SMPP server
                        successfulSubmissions+=parseInt(tps,10)
                        messagesSent+=parseInt(tps,10)
                    })
                    .catch((error) => {
                        console.error('Some messages failed', error);
                        // session.unbind(); // Unbind from the SMPP server
                    });
    
            }, 1000);
        }
    });
};

const createSubmitSmPromise = (count,dest,src,message,session) => {
    return new Promise((resolve, reject) => {
        session.submit_sm({
            destination_addr: dest,
            source_addr: src,
            short_message: `${count}.${message}`
        }, (pdu) => {
            if (pdu.command_status === 0) {
                console.log(`Message ${count} successfully sent`);
                resolve();
            } else {
                console.log(`Failed to send message ${count}`);
                reject(`Message ${count} failed with status ${pdu.command_status}`);
            }
        });
    });
};

