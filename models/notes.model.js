const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const notesSchema = new Schema({
    username: {
        type: String,
        required: true,
        uniquie: true,
        trim: true,
        minlength: 3
    },
    notes: {
        type: String,
        required: false,
        unique: false,
        trim: false
    }
    // userID: {
    //     type: Number,
    //     required: true
    // }
},{
    timestamps: true,
}
);

const Notes = mongoose.model('Notes', notesSchema);

module.exports = Notes;