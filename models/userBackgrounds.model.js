const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userBackgroundSchema = new Schema({
    userID: {
        type: String,
        required: true
    },
    image: {
        data: Buffer,
        contentType: String,
        required: false,
        uniquie: false,
    }
},{
    timestamps: true,
}
);

const UserBackground = mongoose.model('userBackground', userBackgroundSchema);

module.exports = UserBackground;