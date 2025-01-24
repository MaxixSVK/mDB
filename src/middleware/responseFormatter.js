const responseFormatter = (req, res, next) => {
    res.success = (data) => {
        if (typeof data === 'object') {
            res.json(data);
        } else {
            res.json({ data });
        }
    };

    res.error = (message, code = 500) => {
        res.status(code).json({
            msg: message
        });
    };

    next();
};

module.exports = responseFormatter;