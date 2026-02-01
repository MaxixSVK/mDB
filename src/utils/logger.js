const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

let logger = null;

function getLogger() {
    if (logger) {
        return logger;
    }

    const config = require('../../config.json');

    const loggerTransports = [
        new transports.Console()
    ];

    if (config.logs.saveToFile) {
        loggerTransports.push(
            new transports.File({ filename: config.logs.name })
        );
    }

    logger = createLogger({
        format: combine(
            timestamp(),
            logFormat
        ),
        transports: loggerTransports
    });

    return logger;
}

module.exports = getLogger();