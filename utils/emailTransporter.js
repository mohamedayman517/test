const nodemailer = require('nodemailer');

console.log('Initializing email transporter...');
console.log('Email configuration:', {
    service: 'gmail',
    user: process.env.EMAIL,
    hasPassword: !!process.env.PASS
});

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Error verifying email configuration:', error);
        console.error('Error details:', {
            code: error.code,
            command: error.command,
            response: error.response
        });
    } else {
        console.log('Email server is ready to send messages');
    }
});

module.exports = transporter; 