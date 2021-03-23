const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var isAuthSchema = new Schema({
    user: {
        type: String,
        default: 0
    },
    login: String,
    online: {
        type: Boolean,
        default: false
    },
    lastvisit: {
        type: String,
        default: 0
    },
}, {
    timestamps: true
}
)

var isAuth = mongoose.model('isAuth', isAuthSchema);
module.exports = isAuth;