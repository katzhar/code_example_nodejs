const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const usersSchema = new Schema({
  fn: String,
  ln: String,
  login: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: String,
  resetlink: {
    type: String,
    default: 0
  },
  confirmlink: {
    type: String,
    default: 0
  },
  confirm: {
    type: Boolean,
    default: false
  },
  age: Number,
  location: {
    lat: {
      type: String
    },
    lng: {
      type: String
    }
  },
  sex: String,
  sexpref: String,
  bio: String,
  tags: Array,
  avatar: String,
  gallery: Array,
  visitme: Array,
  likeme: Array,
  ilike: Array,
  iblock: Array,
  like: {
    type: Boolean,
    default: true
  },
  block: {
    type: Boolean,
    default: true
  },
  fame_rating: {
    type: Number,
    default: 0
  },
  common_tags: {
    type: Number,
    default: 0
  },
  distance: {
    type: Number,
    default: 0
  },
  match: {
    type: Boolean,
    default: false
  },
  viewcount: {
    type: Number,
    default: 0
  },
})

var Users = mongoose.model('Users', usersSchema);
module.exports = Users;