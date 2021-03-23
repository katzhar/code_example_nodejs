const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
let Users = require('../models/users');
let isAuth = require('../models/isAuth');

const router = express.Router();
router.use(bodyParser.json());

function base64_encode(file) {
    let bitmap = fs.readFileSync(file);
    return new Buffer.from(bitmap).toString('base64');
}

function getImgData(img) {
    let img1 = img + ''
    let info = img1.split('&');
    let img64 = base64_encode(info[0]);
    let resImage = `data:${info[1]};base64,${img64}`;
    return resImage;
}

function getGalleryData(arr) {
    let arr2 = [];
    let elem;
    for (let i = 0; i < arr.length; i++) {
        elem = getImgData(arr[i]);
        arr2.push(elem);
    }
    return (arr2);
}

router.get('/', (req, res) => {
    let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
    if (!checkForHexRegExp.test(req.query._id))
        res.send({ msg: 'wrong params' });
    else if (checkForHexRegExp.test(req.query._id)) {
        let obj = {};
        Users.findOne({ _id: req.query._id }, {
            _id: 1, login: 1, fn: 1, ln: 1, sex: 1, sexpref: 1, fame_rating: 1,
            age: 1, bio: 1, tags: 1, avatar: 1, gallery: 1
        }, (err, user) => {
            if (err) throw err;
            if (!user)
                return res.redirect('/match');
            if (user) {
                obj["match"] = user.match;
                if (user.gallery.length !== 0)
                    obj["gallery"] = getGalleryData(user.gallery);
                if (user.avatar)
                    obj["avatar"] = getImgData(user.avatar);
                return res.send(obj)
            }
        })
    }
});

router.get('/:userId', (req, res) => {
    let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
    if (!checkForHexRegExp.test(req.params.userId))
        res.send({ msg: 'wrong params' });
    else if (checkForHexRegExp.test(req.params.userId)) {
        let obj = {};
        Users.updateOne({ _id: req.params.userId }, { $push: { visitme: req.session._id } },
            (err, user) => {
                if (err) throw err;
                Users.findOne({ _id: req.params.userId }, {
                    _id: 1, login: 1, fn: 1, ln: 1, sex: 1, sexpref: 1, fame_rating: 1,
                    age: 1, bio: 1, tags: 1, avatar: 1, gallery: 1, location: 1
                }, (err, data) => {
                    if (err) throw err;
                    if (!data)
                        return res.redirect('/match')
                    if (data) {
                        obj["info"] = data;
                        if (data.gallery.length !== 0)
                            obj["gallery"] = getGalleryData(data.gallery);
                        if (data.avatar)
                            obj["avatar"] = getImgData(data.avatar);
                        isAuth.findOne({ user: data._id }, { online: 1, lastvisit: 1 },
                            (err, data) => {
                                if (err) throw err;
                                if (data)
                                    obj["online"] = data;
                                return res.json(obj)
                            })
                    }
                })
            });
    }
});

module.exports = router