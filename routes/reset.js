const express = require('express');
const Users = require('../models/users');
const bodyParser = require('body-parser');

let router = express.Router();
router.use(bodyParser.json());

router.post('/', (req, res) => {
    Users.findOne({ resetlink: req.body.key }, (err, user) => {
        if (err) throw err;
        if (!user)
            return res.send({ key: "", msg: "No such user in the DataBase" });
        if (user) {
            Users.updateOne({ resetlink: req.body.key }, {
                $set: { password: 0 }
            }, (err, key) => {
                if (err) throw err;
                if (key)
                    return res.json({ key: req.body.key, msg: "" });
                else
                    return res.redirect('/')
            });
        }
    });
});

module.exports = router;