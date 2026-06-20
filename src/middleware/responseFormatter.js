const sharp = require('sharp');

const responseFormatter = (req, res, next) => {
    res.success = (data, message = null) => {
        res.status(200).json({ msg: message, data });
    };

    res.error = (code = 500, message) => {
        res.status(code).json({ error: message });
    };

    res.empty = (message = 'Requested resource does not exist') => {
        res.status(200).json({ msg: message, data: null });
    };

    res.restricted = (message = 'You do not have access to view this data') => {
        res.status(403).json({ msg: message, data: null });
    };

    res.sendImage = (filePath, quality) => {
        const sendBuffer = (width) => {
            sharp(filePath)
                .resize(width)
                .toBuffer({ resolveWithObject: true })
                .then(({ data, info }) => {
                    res.type(info.format).send(data);
                })
                .catch(next);
        };

        switch (quality) {
            case 'l':
                sendBuffer(200);
                break;

            case 'm':
                sendBuffer(500);
                break;

            default:
                res.sendFile(filePath);
                break;
        }
    };

    next();
};

module.exports = responseFormatter;