const sharp = require('sharp');

const imageSender = (req, res, next) => {
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

module.exports = imageSender;