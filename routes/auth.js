const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
let Users = require('../models/users');
let isAuth = require('../models/isAuth');

const router = express.Router();
router.use(bodyParser.json());

router.post('/', async (req, res) => {
    Users.findOne({ login: req.body.login }, async (err, user) => {
        if (err) throw err
        if (!user)
            return res.send({ msg: 'No such user in the DataBase' });
        else if (user.confirm !== true)
            return res.send({ msg: 'Please verify your email address' });
        else if (user) {
            await bcrypt.compare(req.body.password, user.password, async (err, psswd) => {
                if (err) throw err
                if (!psswd)
                    return res.send({ msg: 'Incorrect password' });
                if (psswd) {
                    await Users.findOne({ login: req.body.login },
                        { _id: 1, login: 1, email: 1, match: 1 },
                        (err, data) => {
                            if (err) throw err;
                            if (!data)
                                return res.redirect('/')
                            if (data) {
                                isAuth.updateOne({ login: req.body.login },
                                    { $set: { online: true, user: data._id } }, (err, ok) => {
                                        if (err) throw err;
                                    });
                                req.session._id = data._id;
                                return res.status(200).json(data);
                            }
                        });
                }
            });
        }
    });
});

module.exports = router;