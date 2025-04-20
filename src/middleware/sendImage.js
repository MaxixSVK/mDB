const sharp = require('sharp');

const imageSender = (req, res, next) => {
  res.sendImage = (filePath, quality) => {
    switch (quality) {
      case 'l': 
        sharp(filePath)
          .resize(200)
          .toBuffer()
          .then(data => {
            res.set('Content-Type', 'image').send(data);
          })
          .catch(err => {
            next(err);
          });
        break;

      case 'm':
        sharp(filePath)
          .resize(500)
          .toBuffer()
          .then(data => {
            res.set('Content-Type', 'image').send(data);
          })
          .catch(err => {
            next(err);
          });
        break;

      default:
        res.set('Content-Type', 'image').sendFile(filePath);
        break;
    }
  };
  next();
};

module.exports = imageSender;