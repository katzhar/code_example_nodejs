require('dotenv/config');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const Users = require('../models/users');
const fs = require('fs');

const router = express.Router();
router.use(bodyParser.json());

let getDistance = (φA, λA, φB, λB) => {
    const EARTH_RADIUS = 6372795;
    // перевести координаты в радианы
    let lat1 = φA * Math.PI / 180;
    let lat2 = φB * Math.PI / 180;
    let long1 = λA * Math.PI / 180;
    let long2 = λB * Math.PI / 180;
    // косинусы и синусы широт и разницы долгот
    let cl1 = Math.cos(lat1);
    let cl2 = Math.cos(lat2);
    let sl1 = Math.sin(lat1);
    let sl2 = Math.sin(lat2);
    let delta = long2 - long1;
    let cdelta = Math.cos(delta);
    let sdelta = Math.sin(delta);
    // вычисления длины большого кругa
    let y = Math.sqrt(((cl2 * sdelta) ** 2) + ((cl1 * sl2 - sl1 * cl2 * cdelta) ** 2));
    let x = sl1 * sl2 + cl1 * cl2 * cdelta;
    let ad = Math.atan2(y, x); // Функция вычисляет арктангенс переменных x и y
    let dist = (ad * EARTH_RADIUS) / 1000;
    return dist;
}

let countTags = (arr1, arr2) => {
    let commonTags = arr1.concat(arr2)
    let sorted_arr = commonTags.slice().sort();
    let results = [];
    for (let i = 0; i < sorted_arr.length - 1; i++) {
        if (sorted_arr[i + 1] === sorted_arr[i]) {
            results.push(sorted_arr[i]);
        }
    }
    return results.length;
}

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

router.post('/filter', async (req, res) => {
    const page = req.body.page;
    const limit = 5;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    let all = [];
    if (typeof (req.session._id) !== 'undefined') {
        Users.findOne({ _id: req.session._id }, (err, user) => {
            if (err) throw err;
            if (user.sexpref === "bi") {
                Users.find({ match: 'true' }, { _id: 1 }, (err, allusers) => {
                    if (err) throw err;
                    if (allusers) {
                        for (let i = 0; i < allusers.length; i++) {
                            if (user._id !== allusers[i]._id) {
                                all.push(allusers[i]._id);
                            }
                        }
                        let blocked = user.iblock + user._id;
                        let filter = all.filter(n => blocked.indexOf(n) === -1);
                        filter.forEach(block => {
                            Users.updateOne({ _id: block }, { $set: { block: false } }, (err) => {
                                if (err) throw err;
                            })
                        })
                        if (filter) {
                            let likers = user.ilike;
                            let filter2 = filter.filter(n => likers.indexOf(n) === -1);
                            filter2.forEach(like => {
                                Users.updateOne({ _id: like }, { $set: { like: false } }, (err) => {
                                    if (err) throw err
                                })
                            })
                            getData(filter2, filterUsers);
                        }
                    }
                })
            }
            else if (user.sexpref !== 'bi') {
                Users.find({ $and: [{ sex: user.sexpref }, { match: 'true' }] },
                    { _id: 1 }, (err, allusers) => {
                        if (err) throw err;
                        if (!allusers)
                            return res.redirect('/match');
                        if (allusers) {
                            for (let i = 0; i < allusers.length; i++) {
                                if (user._id !== allusers[i]._id) {
                                    all.push(allusers[i]._id);
                                }
                            }
                            let blocked = user.iblock + user._id;
                            let filter = all.filter(n => blocked.indexOf(n) === -1);
                            filter.forEach(block => {
                                Users.updateOne({ _id: block }, { $set: { block: false } },
                                    (err) => {
                                        if (err) throw err;
                                    })
                            })
                            if (filter) {
                                let likers = user.ilike;
                                let filter2 = filter.filter(n => likers.indexOf(n) === -1);
                                filter2.forEach(like => {
                                    Users.updateOne({ _id: like }, { $set: { like: false } },
                                        (err) => {
                                            if (err) throw err;
                                        })
                                })
                                getData(filter2, filterUsers);
                            }
                        }
                    })
            }
        })
    }
    else {
        return res.redirect('/');
    }

    async function getData(arr, filter) {
        let arr2 = [];
        for (let i = 0; i < arr.length; i++) {
            let obj = {};
            await Users.findOne({ _id: arr[i] }, {
                _id: 1, login: 1, age: 1, bio: 1, sex: 1, tags: 1, like: 1, common_tags: 1,
                block: 1, location: 1, fame_rating: 1, avatar: 1, gallery: 1
            }, (err, users) => {
                if (err) throw err;
                else {
                    obj["info"] = users;
                    if (users.gallery.length !== 0)
                        obj["gallery"] = getGalleryData(users.gallery);
                    if (users.avatar)
                        obj["avatar"] = getImgData(users.avatar);
                    arr2.push(obj);
                }
            })
        }
        filter(arr2);
    }

    async function ageFilt(arr) {
        let agefilter = [];
        await arr.forEach(data => {
            if (data.info.age >= req.body.age[0] && data.info.age <= req.body.age[1]) {
                agefilter.push(data);
            }
        })
        return agefilter;
    }

    async function fameRatingFilt(arr) {
        let famefilter = [];
        await arr.forEach(data => {
            if (data.info.fame_rating >= req.body.fame[0] && data.info.fame_rating <= req.body.fame[1]) {
                famefilter.push(data);
            }
        })
        return famefilter;
    }

    async function filterUsers(users) {
        ageFilt(users).then((arr) => {
            fameRatingFilt(arr).then((arr) => {
                Users.findOne({ _id: req.session._id }, async (err, user) => {
                    if (err) throw err;
                    if (!user)
                        return res.redirect('/match');
                    if (user) {
                        let filterDist = [];
                        let myCoord = {
                            lat: user.location.lat,
                            lng: user.location.lng
                        }
                        let filterGeo = {
                            min: req.body.location[0],
                            max: req.body.location[1]
                        }
                        await arr.forEach(data => {
                            let result = getDistance(data.info.location.lat, data.info.location.lng, myCoord.lat, myCoord.lng);
                            if (result >= filterGeo.min && result <= filterGeo.max)
                                filterDist.push(data);
                            return filterDist;
                        })
                        if (req.body.tags[0] !== 0 || req.body.tags[1] !== 5) {
                            let UserArr = [];
                            filterDist.forEach(elem => {
                                let count = countTags(elem.info.tags, user.tags);
                                if (count >= req.body.tags[0] && count <= req.body.tags[1])
                                    UserArr.push(elem);
                                return UserArr;
                            })
                            sortUsers(UserArr);
                        }
                        else
                            sortUsers(filterDist);
                    }
                })
            })
        })
    }

    function compareAge(a, b) {
        const lover1 = a.info.age;
        const lover2 = b.info.age;
        let comp = 0;
        lover1 > lover2 ? comp = 1 : comp = -1;
        return comp;
    }

    function compareFame(a, b) {
        const lover1 = a.info.fame_rating;
        const lover2 = b.info.fame_rating;
        let comp = 0;
        lover1 < lover2 ? comp = 1 : comp = -1;
        return comp;
    }

    function compareTags(a, b) {
        const lover1 = a.info.common_tags;
        const lover2 = b.info.common_tags;
        let comp = 0;
        lover1 < lover2 ? comp = 1 : comp = -1;
        return comp;
    }

    function compareDist(a, b) {
        const lover1 = a.info.distance;
        const lover2 = b.info.distance;
        let comp = 0;
        lover1 > lover2 ? comp = 1 : comp = -1;
        return comp;
    }

    function sortUsers(cb) {
        let obj = {};
        if (req.body.sort === 'age') {
            let result = cb.sort(compareAge);
            let count = result.length;
            let pagUsers = result.slice(startIndex, endIndex);
            obj["count"] = count;
            obj["users"] = pagUsers;
            res.json(obj);
        }
        else if (req.body.sort === 'fame_rating') {
            let result = cb.sort(compareFame);
            let count = result.length;
            let pagUsers = result.slice(startIndex, endIndex);
            obj["count"] = count;
            obj["users"] = pagUsers;
            res.json(obj);
        }
        else if (req.body.sort === 'tags') {
            Users.findOne({ _id: req.session._id }, async (err, user) => {
                let filterUsers = [];
                if (err) throw err;
                if (!user)
                    return res.redirect('/match');
                if (user) {
                    await cb.forEach(elem => {
                        let count = countTags(elem.info.tags, user.tags);
                        Users.updateOne({ login: elem.info.login },
                            { $set: { common_tags: count } }, (err) => {
                                if (err) throw err;
                            })
                        filterUsers.push(elem);
                        return filterUsers;
                    })
                }
                let result = filterUsers.sort(compareTags);
                let count = result.length;
                let pagUsers = result.slice(startIndex, endIndex);
                obj["count"] = count;
                obj["users"] = pagUsers;
                res.json(obj);
            })
        }
        else if (req.body.sort === 'location') {
            let filterUsers = [];
            Users.findOne({ _id: req.session._id }, async (err, user) => {
                if (err) throw err;
                if (!user)
                    return res.redirect('/match');
                if (user) {
                    let myCoord = {
                        lat: user.location.lat,
                        lng: user.location.lng
                    }
                    await cb.forEach(elem => {
                        let count = getDistance(elem.info.location.lat, elem.info.location.lng, myCoord.lat, myCoord.lng);
                        Users.updateOne({ login: elem.info.login }, { $set: { distance: count } }, (err, data) => {
                            if (err) throw err;
                        })
                        filterUsers.push(elem);
                        return filterUsers;
                    })
                }
                let result = filterUsers.sort(compareDist);
                let count = result.length;
                let pagUsers = result.slice(startIndex, endIndex);
                obj["count"] = count;
                obj["users"] = pagUsers;
                res.json(obj);
            })
        }
        else if (req.body.sort === '') {
            let obj = {};
            let count = cb.length;
            let pagUsers = cb.slice(startIndex, endIndex);
            obj["count"] = count;
            obj["users"] = pagUsers;
            res.json(obj);
        }
    }
})


router.get('/action', (req, res) => {
    function fameRating(user) {
        Users.findOne({ _id: user }, (err, data) => {
            if (err) throw err;
            else {
                let length = data.likeme.length;
                Users.updateOne({ _id: user },
                    { $set: { fame_rating: length } }, (err, fame) => {
                        if (err) throw err;
                    })
            }
        })
    }
    if (!req.session)
        res.redirect('/');
    else {
        if (req.query.like === 'true') {
            let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            if (!checkForHexRegExp.test(req.query._id))
                res.send({ msg: 'wrong params' });
            else if (checkForHexRegExp.test(req.query._id)) {
                Users.findOne({ _id: req.query._id }, (err, luch) => {
                    if (err) throw err;
                    if (!luch)
                        res.send({ msg: 'wrong params' });
                    else if (luch) {
                        Users.findOne({ _id: req.session._id }, (err, check) => {
                            if (err) throw err;
                            if (!check.ilike.includes(req.query._id)) {
                                Users.updateOne({ _id: req.session._id },
                                    { $push: { ilike: req.query._id } }, (err, user) => {
                                        if (err) throw err;
                                        else {
                                            Users.updateOne({ _id: req.query._id },
                                                { $push: { likeme: req.session._id } }, (err, suc) => {
                                                    if (err) throw err;
                                                    fameRating(req.query._id);
                                                    res.json(suc);
                                                })
                                        }
                                    })
                            }
                            else if (check.ilike.includes(req.query._id)) {
                                res.send({ msg: 'u`ve been like that user already' });
                            }
                        })
                    }
                })
            }
        }
        if (req.query.dislike === 'true') {
            let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            if (!checkForHexRegExp.test(req.query._id))
                res.send({ msg: 'wrong params' });
            else if (checkForHexRegExp.test(req.query._id)) {
                Users.findOne({ _id: req.query._id }, (err, luch) => {
                    if (err) throw err;
                    if (!luch)
                        res.send({ msg: 'wrong params' });
                    else if (luch) {
                        Users.updateOne({ _id: req.session._id },
                            { $pull: { ilike: req.query._id } },
                            (err, user) => {
                                if (err) throw err;
                                Users.updateOne({ _id: req.query._id },
                                    { $pull: { likeme: req.session._id } }, (err, dis) => {
                                        if (err) throw err;
                                        fameRating(req.query._id);
                                        Users.updateOne({ _id: req.query._id },
                                            { $set: { like: false } }, (err, dis) => {
                                                if (err) throw err;
                                                res.json(dis);
                                            })
                                    })
                            })
                    }
                })
            }
        }
        if (req.query.block === 'true') {
            let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            if (!checkForHexRegExp.test(req.query._id))
                res.send({ msg: 'wrong params' });
            else if (checkForHexRegExp.test(req.query._id)) {
                Users.findOne({ _id: req.query._id }, (err, luch) => {
                    if (err) throw err;
                    if (!luch)
                        res.send({ msg: 'wrong params' });
                    else if (luch) {
                        Users.updateOne({ _id: req.session._id },
                            { $push: { iblock: req.query._id } },
                            (err, user) => {
                                if (err) throw err;
                                if (user) {
                                    Users.updateOne({ _id: req.query._id },
                                        { $set: { block: true } }, (err, data) => {
                                            if (err) throw err;
                                            res.json(data);
                                        })
                                }
                            })
                    }
                })
            }
        }
        if (req.query.block === 'false') {
            let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            if (!checkForHexRegExp.test(req.query._id))
                res.send({ message: 'wrong params' });
            else if (checkForHexRegExp.test(req.query._id)) {
                Users.findOne({ _id: req.query._id }, (err, luch) => {
                    if (err) throw err;
                    if (!luch)
                        res.send({ message: 'wrong params' });
                    else if (luch) {
                        Users.updateOne({ _id: req.session._id },
                            { $pull: { iblock: req.query._id } },
                            (err, user) => {
                                if (err) throw err;
                                if (user) {
                                    Users.updateOne({ _id: req.query._id },
                                        { $set: { block: false } },
                                        (err, data) => {
                                            if (err) throw err;
                                            res.json(data);
                                        })
                                }
                            })
                    }
                })
            }
        }
        if (req.query.report === 'true') {
            let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            if (!checkForHexRegExp.test(req.query._id))
                res.send({ message: 'wrong params' });
            else if (checkForHexRegExp.test(req.query._id)) {
                Users.findOne({ _id: req.query._id }, (err, luch) => {
                    if (err) throw err;
                    if (!luch)
                        res.send({ message: 'wrong params' });
                    else if (luch) {
                        Users.findOne({ _id: req.session._id }, (err, user) => {
                            if (err) throw err;
                            if (user) {
                                try {
                                    let email = user.email;
                                    let login = user.login;
                                    async function sendMail(email, login) {
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
                                            subject: 'Matcha Report 🔥!',
                                            text: 'Matcha Report 🔥',
                                            html: `<div> Hi, ${login}! <br><p>Thanks for your report! <br> You help us become better.</p><p> Cheers, <br> Matcha Team <3 </p></div>`
                                        };
                                        transporter.sendMail(mailOptions, function (error, info) {
                                            if (error) {
                                                console.log("sendmail" + error);
                                            } else {
                                                return res.status(200).send({ message: "Your report sent successfully" });
                                            }
                                        });
                                    }
                                    sendMail(email, login).catch(console.error);
                                }
                                catch {
                                    return res.redirect('/');
                                }
                            }
                        })
                    }
                })
            }
        }
    }
})

module.exports = router;