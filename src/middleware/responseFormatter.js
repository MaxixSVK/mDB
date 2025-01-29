const responseFormatter = (req, res, next) => {
    res.success = (data) => {
        if (typeof data === 'object') {
            res.json(data);
        } else {
            res.json({ data });
        }
    };

    res.error = (message, code = 500, v2) => {
        const response = v2 ? { error: message } : { msg: message };
        res.status(code).json(response);
    };

    next();
};

module.exports = responseFormatter;