const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  role: {
    type: String,
    default: "user"
  },
  token: {
    type: String,
    default: ""
  },
  flag: {
    type: String,
    default: "active"
  },
  connections : { type : Array , "default" : [] },
  pendingConnections : { type : Array , "default" : [] },
  receivedConnections : { type : Array , "default" : [] },
  date: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
