const nodemailer = require("nodemailer");

async function sendEmail(to, subject, text, html) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: "mDB Team <" + process.env.EMAIL_USER + ">",
        to,
        subject,
        text,
        html,
        headers: {
            'Auto-Submitted': 'auto-generated',
        },
    };

    return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;