const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        uniquie: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: true,
        uniquie: true,
        trim: true,
        minlength: 8
    },
    notes: {
        type: String,
        required: false,
        unique: false,
        trim: false
    }
},{
    timestamps: true,
}
);

const User = mongoose.model('User', userSchema);

module.exports = User;