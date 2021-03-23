require('dotenv/config');
const express = require('express');
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const Users = require('../models/users');
const bodyParser = require('body-parser');

const router = express.Router();
router.use(bodyParser.json());

router.post('/', (req, res) => {
    token = crypto.randomBytes(24).toString('hex');
    let link = "http://localhost:3000/reset/" + token;
    Users.findOne({ email: req.body.email }, (err, user) => {
        if (err) throw err;
        if (!user)
            return res.send({ msg: "There is no user registered with that email" });
        if (user) {
            Users.updateOne({ email: req.body.email }, { $set: { resetlink: token } }, (err, ok) => {
                if (err) throw err;
                function sendMail(email, link) {
                    let transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: process.env.NODEMAILER_LOGIN,
                            pass: process.env.NODEMAILER_PASSWORD
                        }
                    });
                    let mailOptions = {
                        from: '"Matcha Team 💖" <love@matcha.com>',
                        to: email,
                        subject: 'Reset your password',
                        html: `<div> Hi! <br><p>Don't worry, we all forget sometimes! You've recently asked to reset the password for this Matcha account: ${email} </p><p>To update your password, follow this link:</p><p> ${link} </p><p> Cheers, <br> Matcha Team <3 </p></div>`
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error)
                            console.log("sendmail" + error);
                        else
                            return res.send({ msg: "Please check your email" });
                    });
                }
                sendMail(req.body.email, link);
            })
        }
    })
})

module.exports = router;