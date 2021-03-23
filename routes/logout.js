const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const isAuth = require('../models/isAuth');

router.delete('/', (req, res) => {
    async function changeStatus(user, callback) {
        let time = moment().format('MMMM Do YYYY h:mm:ss a');
        await isAuth.updateOne({ user: user },
            { $set: { online: false, lastvisit: time } }, (err) => {
                if (err) throw err;
            })
        callback();
    }
    changeStatus(req.query._id, function destroySession() {
        req.session.destroy();
        res.clearCookie();
        return res.send({ msg: 'bye' });
    });
});

module.exports = router; 