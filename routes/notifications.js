const express = require('express');
const bodyParser = require('body-parser');
const Users = require('../models/users');
const Notifications = require('../models/notifications');

const router = express.Router();
router.use(bodyParser.json());

router.get('/', (req, res) => {
    if (req.query.viewcount) {
        Users.updateOne({ _id: req.session._id },
            { $set: { viewcount: req.query.viewcount } },
            (err, data) => {
                if (err) throw err;
                if (data)
                    return res.send(data);
                else
                    return res.redirect('/');
            })
    }
    else if (!req.query.viewcount) {
        Users.updateOne({ _id: req.session._id }, { $set: { viewcount: 0 } },
            (err, data) => {
                if (err) throw err;
                if (data)
                    return res.send(data);
                else
                    return res.redirect('/');
            })
    }
})

router.route('/:userId')
    .get((req, res) => {
        let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
        if (!checkForHexRegExp.test(req.params.userId))
            res.send({ msg: 'wrong params' });
        else if (checkForHexRegExp.test(req.params.userId)) {
            let obj = {};
            Notifications.find({ recipient: req.params.userId },
                { sender: 1, recipient: 1, action: 1, createdAt: 1 }, (err, data) => {
                    if (err) throw err;
                    if (data) {
                        getData(data).then((arr) => {
                            Users.findOne({ _id: req.params.userId }, { viewcount: 1 }, (err, notif) => {
                                if (err) throw err;
                                if (notif) {
                                    obj["viewcount"] = notif.viewcount;
                                    obj["notifications"] = arr;
                                    res.send(obj);
                                }
                                else
                                    res.json({ viewcount: "", notifications: "" });
                            })
                        });
                    }
                    else
                        res.json({ viewcount: "", notifications: "" });
                })

            async function getData(arr) {
                let notif = [];
                for (let i = 0; i < arr.length; i++) {
                    let obj = {};
                    obj["info"] = arr[i];
                    await Users.findOne({ _id: arr[i].sender }, { login: 1 }, (err, data) => {
                        if (err) throw err;
                        if (data) {
                            obj["login"] = data;
                            notif.push(obj)
                        }
                    })
                }
                return (notif);
            }
        }
    })

module.exports = router;