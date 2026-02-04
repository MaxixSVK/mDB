const fs = require('fs');
const path = require('path');
const multer = require('multer');

const createLibraryStorage = () => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.resolve(__dirname, '../../cdn/library/');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        }
    });
};

const createPfpStorage = () => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.resolve(__dirname, '../../cdn/users/pfp');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        }
    });
};

module.exports = {
    createLibraryStorage,
    createPfpStorage
};