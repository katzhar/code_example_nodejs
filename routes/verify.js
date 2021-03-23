const express = require('express');
const bodyParser = require('body-parser');
const Users = require('../models/users');

const router = express.Router();
router.use(bodyParser.json());

router.post('/', (req, res) => {
    let token = req.body.key;
    Users.findOne({ confirmlink: token }, (err, user) => {
        if (err) throw err;
        if (!user)
            res.send({ error: 'No such user in the DataBase' });
        if (user) {
            Users.updateOne({ confirmlink: token }, {
                $set: {
                    confirm: true,
                    confirmlink: 0
                }
            }, (err, res) => {
                if (err) throw err;
            })
            res.send();
        }
    })
})

module.exports = router;