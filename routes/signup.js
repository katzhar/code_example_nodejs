require('dotenv/config');
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const Users = require('../models/users');
const isAuth = require('../models/isAuth');

const router = express.Router();
router.use(bodyParser.json());

router.post('/', (req, res) => {
    const namesChecker = (first, last) => {
        const regex = /^[a-zA-Z]+$/;
        return regex.test(first) && regex.test(last);
    };

    const emailChecker = email => {
        const regex = /\S+@\S+\.\S+/;
        return regex.test(email);
    };

    const pwdChecker = password => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
        return regex.test(password);
    };

    async function sendMail(email, login, link) {
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
            subject: 'Welcome 😍!',
            text: 'Confirm your account 🔥',
            html: `<div> Hi, ${login}! <br><p>Please verify your email address so we know that it is really you: ${link} </p><p> Cheers, <br> Matcha Team <3 </p></div>`
        };
        transporter.sendMail(mailOptions, function (err) {
            if (err) 
                console.log("sendmail" + err);
            else 
                return res.send({ msg: "Please check your email" });
        });
    }

    async function validation(data) {
        if (await Users.exists({ email: data.email }))
            return res.send({ msg: 'this email is already in use' });
        if (!emailChecker(data.email))
            return res.send({ msg: 'incorrect format of email' });
        if (await Users.exists({ login: data.login }))
            return res.send({ msg: 'this login is already in use' });
        if (!namesChecker(data.fn, data.ln))
            return res.send({ msg: 'your name must contain only characters' });
        if (!pwdChecker(data.password))
            return res.send({ msg: 'Your password must be at least 6 characters long, be of mixed case and also contain a digit or symbol.' })
        else {
            const hashedPassword = await bcrypt.hash(data.password, 10)
            let token = crypto.randomBytes(24).toString('hex')
            let link = "http://localhost:3000/auth/" + token;
            let user = new Users({
                fn: data.fn,
                ln: data.ln,
                login: data.login,
                email: data.email,
                password: hashedPassword,
                confirmlink: token
            })
            user.save();
            let status = new isAuth({ login: data.login });
            status.save();
            sendMail(req.body.email, req.body.login, link).catch(console.error);
        }
    }
    validation(req.body);
});

module.exports = router;