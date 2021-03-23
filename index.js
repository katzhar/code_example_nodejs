require('dotenv/config');
const express = require('express');
const app = express();
const router = express.Router();
const flash = require('express-flash');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const Chat = require('./models/chat');
const Users = require('./models/users');
const Notifications = require('./models/notifications');
const moment = require('moment-timezone');
const cors = require('cors');
const http = require('http').createServer(app);
const io = require('socket.io')(http, 
    {'pingTimeout': 180000, 'pingInterval': 25000
});

const db = mongoose.connection;
mongoose.set('useCreateIndex', true);
mongoose.connect(process.env.DB_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true });
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to DataBase'));

moment.tz.setDefault('Europe/Moscow');
moment.locale('en');

app.use(router);
app.use(express.json());
app.use(cors());
app.use(flash());

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

app.use(session({
    store: new FileStore({ logFn: function () { } }),
    secret: 'matchasecret',
    resave: true,
    saveUninitialized: false,
    name: 'session-id',
    cookie: { maxAge: 100000000 },
}));

io.on('connection', (socket) => {
    socket.on('chat message', async (msg) => {
        socket.broadcast.emit('chat message', msg);
        socket.broadcast.emit('notif', msg);
        let chatMessage = new Chat({
            sender: msg.sender,
            recipient: msg.recipient,
            msg: msg.msg
        })
        await chatMessage.save();
        createNotif(msg.sender, msg.recipient, 'msg');
    });

    socket.on('notif', async (notif) => {
        if (notif.action === 'like') {
            let match = {
                login: notif.login,
                login2: notif.login2,
                sender: notif.sender,
                recipient: notif.recipient,
                action: 'match'
            }
            Users.findOne({ _id: notif.sender },
                { ilike: 1, likeme: 1 }, (err, act) => {
                    if (err) throw err;
                    if (act.likeme.includes(notif.recipient)) {
                        socket.broadcast.emit('notif', match);
                    }
                })
        }
        socket.broadcast.emit('notif', notif);
        createNotif(notif.sender, notif.recipient, notif.action);
    })

    socket.on('disconnect', () => {
        socket.disconnect();
    })
})

function createNotif(sender, recipient, action) {
    let notif = new Notifications({
        sender: sender,
        recipient: recipient,
        action: action
    })
    notif.save();
}

let index = require('./routes/index');
let auth = require('./routes/auth');
let isAuth = require('./routes/isAuth');
let signup = require('./routes/signup');
let verify = require('./routes/verify');
let account = require('./routes/account');
let chat = require('./routes/chat');
let match = require('./routes/match');
let reset = require('./routes/reset');
let profile = require('./routes/profile');
let resetpassword = require('./routes/resetpassword');
let newpassword = require('./routes/newpassword');
let notifications = require('./routes/notifications');
let logout = require('./routes/logout');

app.use('/index', index);
app.use('/auth', auth);
app.use('/isAuth', isAuth);
app.use('/signup', signup);
app.use('/verify', verify);
app.use('/account', account);
app.use('/match', match);
app.use('/chat', chat);
app.use('/reset', reset);
app.use('/profile', profile);
app.use('/resetpassword', resetpassword);
app.use('/newpassword', newpassword);
app.use('/notifications', notifications);
app.use('/logout', logout);

http.listen(3027, () => console.log('Server Started'));