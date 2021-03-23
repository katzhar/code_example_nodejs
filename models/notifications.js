const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var notificationsSchema = new Schema({
    sender: String,
    recipient: String,
    action: String
}, {
    timestamps: true
}
)

var Notifications = mongoose.model('Notifications', notificationsSchema);
module.exports = Notifications;