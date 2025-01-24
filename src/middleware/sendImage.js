const sharp = require('sharp');

const imageSender = (req, res, next) => {
  res.sendImage = (filePath, isLowRes, isMidRes,) => {
    if (isLowRes) {
      sharp(filePath)
        .resize(200)
        .toBuffer()
        .then(data => {
          res.set('Content-Type', 'image').send(data);
        })
        .catch(err => {
          next(err);
        });
    } else if (isMidRes) {
      sharp(filePath)
        .resize(500)
        .toBuffer()
        .then(data => {
          res.set('Content-Type', 'image').send(data);
        })
        .catch(err => {
          next(err);
        });
    } else {
      res.set('Content-Type', 'image').sendFile(filePath);
    }
  };
  next();
}

module.exports = imageSender;