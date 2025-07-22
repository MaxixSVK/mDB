const config = require('../config.json');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const loggerTransports = [
    new transports.Console()
];

if (config.logs.saveToFile) {
    loggerTransports.push(
        new transports.File({ filename: config.logs.name })
    );
}

const logger = createLogger({
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: loggerTransports
});

module.exports = logger;