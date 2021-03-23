const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var chatSchema = new Schema({
    sender: String,
    recipient: String,
    msg: String
}, {
    timestamps: true
})

var Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;