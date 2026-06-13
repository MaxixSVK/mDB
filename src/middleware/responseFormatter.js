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

    next();
};

module.exports = responseFormatter;