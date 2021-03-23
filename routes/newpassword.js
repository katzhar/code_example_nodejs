const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const Users = require('../models/users');

const router = express.Router();
router.use(bodyParser.json());

router.post('/', async (req, res) => {
    const pwdChecker = password => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
        return regex.test(password);
    };

    Users.findOne({ resetlink: req.body.key }, async (err, data) => {
        if (err) throw err;
        if (!data)
            return res.send({ msg: 'wrong params' });
        if (data) {
            if (!pwdChecker(req.body.newpass) ||
                req.body.newpass !== req.body.confpass)
                return res.send({ msg: "Please try again" });
            else {
                const hashedPassword = await bcrypt.hash(req.body.newpass, 10)
                Users.updateOne({ resetlink: req.body.key },
                    { $set: { password: hashedPassword, resetlink: 0 } }, (err, pass) => {
                        if (err) throw err;
                        if (!pass)
                            return res.redirect('/newpassword')
                        if (pass)
                            return res.send({ msg: "Password has been changed successfully" });
                    })
            }
        }
    })
})

module.exports = router;