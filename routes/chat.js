const express = require('express');
const bodyParser = require('body-parser');
let Users = require('../models/users');
let Chat = require('../models/chat');
let isAuth = require('../models/isAuth');
const fs = require('fs');

let router = express.Router();
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
    async function getData(arr, callback) {
        let arr2 = [];
        for (let i = 0; i < arr.length; i++) {
            let obj = {};
            await Users.findOne({ _id: arr[i] }, {
                _id: 1, login: 1, age: 1, bio: 1, sex: 1, tags: 1,
                location: 1, fame_rating: 1, avatar: 1, gallery: 1
            }, (err, users) => {
                if (err) throw err;
                if (users) {
                    obj["info"] = users;
                    if (users.gallery.length !== 0)
                        obj["gallery"] = users.gallery;
                    if (users.avatar)
                        obj["avatar"] = users.avatar;
                    arr2.push(obj);
                }
            })
        }
        callback(arr2);
    }

    async function getMoreData(arr) {
        let arr2 = [];
        for (let i = 0; i < arr.length; i++) {
            let obj = {};
            obj["info"] = arr[i].info;
            if (arr[i].avatar)
                obj["avatar"] = getImgData(arr[i].avatar);
            if (arr[i].gallery)
                obj['gallery'] = getGalleryData(arr[i].gallery);
            await isAuth.findOne({ user: arr[i].info._id },
                { user: 1, online: 1, lastvisit: 1 }, (err, data) => {
                    if (err) throw err;
                    if (data)
                        obj["online"] = data;
                    arr2.push(obj);
                })
        }
        res.send(arr2);
    }

    Users.findOne({ _id: req.session._id },
        { ilike: 1, likeme: 1 }, (err, user) => {
            if (err) throw err;
            if (user) {
                let commonId = user.ilike.filter(value => -1 !== user.likeme.indexOf(value));
                getData(commonId, getMoreData);
            }
            else
                return res.redirect('/');
        })
}) 

router.get('/:userId', (req, res) => {
    if (!req.session)
        res.redirect('/chat');
    else {
        let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
        if (!checkForHexRegExp.test(req.params.userId))
            res.send({ msg: 'wrong params' });
        else if (checkForHexRegExp.test(req.params.userId)) {
            Users.findOne({ _id: req.params.userId }, { _id: 1 }, async (err, chat) => {
                if (err) throw err;
                if (!chat)
                    return res.send({ msg: 'No such user in the DataBase' });
                else if (chat) {
                    Users.findOne({ _id: req.session._id }, (err, user) => {
                        if (err) throw err;
                        let likers = user.ilike;
                        let user2 = chat._id;
                        if (!likers.includes(user2))
                            return res.send({ msg: 'Nice try, sweety, but u`r not matched' })
                        else if (likers.includes(user2)) {
                            Chat.find({
                                $or: [{ $and: [{ sender: chat._id }, { recipient: user._id }] },
                                { $and: [{ sender: user._id }, { recipient: chat._id }] }]
                            },
                                { sender: 1, recipient: 1, msg: 1, createdAt: 1 }, (err, data) => {
                                    if (err) throw err;
                                    if (!data)
                                        return res.redirect('/chat');
                                    if (data) {
                                        res.json(data);
                                    }
                                })
                        }
                    })
                }
            })
        }
    }
})

module.exports = router;