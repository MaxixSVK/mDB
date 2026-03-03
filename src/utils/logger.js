const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const loggerTransports = [
    new transports.Console()
];

loggerTransports.push(
    new transports.File({ filename: 'mDB-server.log' })
);

const createAppLogger = () => createLogger({
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: loggerTransports
});

module.exports = createAppLogger();