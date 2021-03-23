const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const fs = require('fs');
const Users = require('../models/users');

const router = express.Router();
router.use(bodyParser.json());

router.route('/addinfo')
    .get((req, res) => {
        Users.findOne({ _id: req.session._id },
            { sex: 1, sexpref: 1, bio: 1, tags: 1, location: 1, age: 1, match: 1 },
            (err, data) => {
                if (err) throw err;
                if (data)
                    return res.json(data);
                if (!data)
                    return res.redirect('/account');
            })
    })
    .post((req, res) => {
        let filterTags = req.body.tags.filter(Boolean);
        Users.updateMany({ _id: req.session._id }, {
            $set: {
                age: req.body.age,
                sex: req.body.sex,
                sexpref: req.body.sexpref,
                bio: req.body.bio,
                tags: filterTags,
                location: {
                    lat: req.body.lat,
                    lng: req.body.lng
                }
            },
        }, (err, data) => {
            if (err) throw err;
            if (!data)
                return res.redirect('/account');
            if (data) {
                let obj = {};
                matchStatus(req.session._id);
                Users.findOne({ _id: req.session._id }, (err, user) => {
                    if (err) throw err;
                    if (user && user.age && user.sexpref && user.avatar)
                        obj["match"] = true;
                    else
                        obj["match"] = false;
                    return res.json(obj);
                })
            }
        })
    })

router.route('/edit')
    .get((req, res) => {
        Users.findOne({ _id: req.session._id },
            { fn: 1, ln: 1, login: 1, email: 1 }, (err, data) => {
                if (err) throw err;
                if (data)
                    return res.status(200).json(data);
                if (!data)
                    res.redirect('/account');
            })
    })

    .post((req, res) => {
        const namesChecker = name => {
            const regex = /^[a-zA-Z]+$/;
            return regex.test(name);
        };

        const emailChecker = email => {
            const regex = /\S+@\S+\.\S+/;
            return regex.test(email);
        };

        async function validation(data, user) {
            if (data.email && data.email !== user.email) {
                if (await Users.exists({ email: data.email }))
                    return res.send({ msg: 'this email is already in use' });
                if (!emailChecker(data.email))
                    return res.send({ msg: 'incorrect format of email' });
            }
            if (data.login && data.login !== user.login) {
                if (await Users.exists({ login: data.login }))
                    return res.send({ msg: 'this login is already in use' });
            }
            if (data.fn && !namesChecker(data.fn))
                return res.send({ msg: 'your name must contain only characters' });
            if (data.ln && !namesChecker(data.ln))
                return res.send({ msg: 'your name must contain only characters' });
            else {
                Users.updateMany({ _id: req.session._id }, {
                    $set: {
                        fn: data.fn,
                        ln: data.ln,
                        login: data.login,
                        email: data.email
                    },
                }, (err, info) => {
                    if (err) throw err;
                    if (info)
                        return res.send({ msg: "edits has been changed succesfully!" });
                    else
                        return res.redirect('/account');
                });
            }
        }

        Users.findOne({ _id: req.session._id }, { login: 1, email: 1 }, (err, user) => {
            if (err) throw err;
            if (!user)
                return res.send('/account');
            if (user)
                validation(req.body, user);
        })
    })

router.post('/changepassword', (req, res) => {
    const pwdChecker = password => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
        return regex.test(password);
    };

    Users.findOne({ _id: req.session._id }, async (err, user) => {
        if (err) throw err
        await bcrypt.compare(req.body.password, user.password, async (err, data) => {
            if (err) throw err
            if (!data)
                return res.send({ msg: "Incorrect password" });
            else if (data) {
                if (!pwdChecker(req.body.newpassword) ||
                    req.body.newpassword !== req.body.newpassword2)
                    return res.send({ msg: "Please try again" });
                else {
                    const hashedPassword = await bcrypt.hash(req.body.newpassword, 10)
                    Users.updateOne({ _id: req.session._id },
                        { $set: { password: hashedPassword } }, async (err, pass) => {
                            if (err) throw err;
                            if (!pass)
                                return res.redirect('/account');
                            if (pass)
                                return res.status(200).send({ msg: "Password has been changed successfully" });
                        })
                }
            }
        })
    })
})

function checkFileType(file) {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(file.originalname.toLowerCase());
    const mimetype = fileTypes.test(file.mimetype)
    if (mimetype && extname) {
        return true;
    } else {
        return false;
    }
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

function matchStatus(id) {
    Users.findOne({ _id: id }, (err, user) => {
        if (err) throw err;
        if (user && user.age && user.sexpref && user.avatar) {
            Users.updateOne({ _id: id },
                { $set: { match: true } }, (err) => {
                    if (err) throw err;
                });
        }
    })
}

router.use(express.static(__dirname));
let upload = multer({ dest: 'uploads/' });
let cpUpload = upload.fields([{ name: 'avatar', maxCount: 1 },
{ name: 'gallery', maxCount: 1 }]);

router.route('/photo')
    .post((req, res) => {
        cpUpload(req, res, (err) => {
            if (req.files['avatar']) {
                if (!checkFileType(req.files['avatar'][0]))
                    return res.send({ error: 'you can`t upload files of this type' });
                else if (checkFileType(req.files['avatar'][0])) {
                    let obj = {};
                    let info = req.files['avatar'][0].path + '&' + req.files['avatar'][0].mimetype;
                    obj["avatar"] = getImgData(info);
                    Users.updateOne({ _id: req.session._id }, { $set: { avatar: info } },
                        async (err, avatar) => {
                            if (err) throw err;
                            if (!avatar)
                                return res.redirect('/account');
                            if (avatar) {
                                matchStatus(req.session._id);
                                Users.findOne({ _id: req.session._id }, (err, user) => {
                                    if (err) throw err;
                                    if (user && user.age && user.sexpref && user.avatar)
                                        obj["match"] = true;
                                    else
                                        obj["match"] = false;
                                    return res.json(obj);
                                })
                            }
                        })
                }
            }
            if (req.files['gallery']) {
                let gallery64 = [];
                Users.findOne({ _id: req.session._id }, { gallery: 1 }, (err, pic) => {
                    if (err) throw err;
                    if (!pic)
                        return res.redirect('/account')
                    if (pic) {
                        let pics = pic.gallery;
                        if (pics.length === 4)
                            return res.send({ msg: 'you can`t upload more than 4 pictures' });
                        else {
                            if (!checkFileType(req.files['gallery'][0]))
                                return res.send({ msg: 'you can`t upload file of this type' });
                            else if (checkFileType(req.files['gallery'][0])) {
                                let info = req.files['gallery'][0].path + '&' + req.files['gallery'][0].mimetype;
                                pics.push(info);
                                gallery64 = getGalleryData(pics)
                                Users.updateOne({ _id: req.session._id }, { $push: { gallery: info } }, (err, data) => {
                                    if (err) throw err;
                                    return res.status(200).json({ gallery: gallery64 });
                                })
                            }
                        }
                    }
                })
            }
        })
    })

    .get((req, res) => {
        let obj = {};
        Users.findOne({ _id: req.session._id }, {
            avatar: 1, gallery: 1, match: 1
        }, (err, user) => {
            if (err) throw err;
            if (!user)
                return res.send({ msg: "err" });
            if (user) {
                obj["match"] = user.match;
                if (user.gallery.length !== 0)
                    obj["gallery"] = getGalleryData(user.gallery);
                if (user.avatar)
                    obj["avatar"] = getImgData(user.avatar);
                return res.send(obj)
            }
        });
    });

router.route('/photo/:photoId')
    .delete((req, res, next) => {
        let num = req.params.photoId - 1;
        let checkForRegExp = new RegExp("^[0-3]{1}$");
        if (!checkForRegExp.test(num))
            res.send({ message: 'wrong params' });
        else if (checkForRegExp.test(num)) {
            Users.findOne({ _id: req.session._id }, { gallery: 1 })
                .then((pic) => {
                    Users.updateOne({ _id: req.session._id }, { $pull: { gallery: pic.gallery[num] } })
                        .then((data) => {
                            Users.findOne({ _id: req.session._id }, { gallery: 1 })
                                .then((ok) => {
                                    return res.json(ok.gallery);
                                })
                        })
                }, (err) => next(err))
                .catch((err) => next(err));
        }
    });

router.get('/popularity', (req, res, next) => {
    let popularity = {};
    Users.findOne({ _id: req.session._id }, (err, id) => {
        if (err) throw err;
        if (!id)
            return res.redirect('/');
        if (id) {
            getData(id.likeme)
                .then((arr) => {
                    popularity["likers"] = arr;
                    getData(id.visitme)
                        .then((arr2) => {
                            popularity["visitors"] = arr2;
                            res.send(popularity);
                        })
                }, (err) => next(err))
                .catch((err) => next(err));
        }
    })

    async function getData(arr) {
        let arrInfo = [];
        for (let i = 0; i < arr.length; i++) {
            await Users.findOne({ _id: arr[i] }, { login: 1 }, (err, users) => {
                if (err) throw err;
                if (users)
                    arrInfo.push(users);
            })
        }
        return arrInfo;
    }
});

module.exports = router;