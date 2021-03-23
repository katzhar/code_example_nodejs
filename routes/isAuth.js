const express = require('express');
const bodyParser = require('body-parser');
const Users = require('../models/users');

const router = express.Router();
router.use(bodyParser.json());

router.get('/', (req, res) => {
    Users.findOne({ _id: req.session._id },
        { _id: 1, login: 1, match: 1 }, (err, user) => {
            if (err) throw err;
            if (!user)
                return res.json({ login: '', _id: '' });
            else 
                return res.json(user);
        })
})

module.exports = router;