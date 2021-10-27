const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const passport = require('passport');
const LocalStrategy = require("passport-local");
const passportLocalMongoose =
        require("passport-local-mongoose");

require('dotenv').config();//configures .env file

//setup express server
const app = express();
const port = process.env.PORT || 5000;//define server port

//middleware
app.use(cors());
app.use(express.json());//enables parsing of json
app.use(morgan('short'));
app.use(express.static('./public'));

app.use(express.urlencoded({ extended: false }));

const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})

//routes to user router documents, only works for direct submissions to database (can't use frontEnd form)
const usersRouter = require('./routes/users');

app.use('/users', usersRouter);


//route code that submits new user to mongodb
let User = require('./models/user.model');//require the user model needed
app.post('/sign_up', (req,res) => {
    console.log("Trying to make a new user");

    const username = req.body.newUsername;//username inserted to form
    const password = req.body.newPassword;//password inserted to form

    const newUser = new User({username, password});//make new user with field info

    newUser.save()//submit to database
        .then(() => res.redirect("/"))
        .catch(err => res.status(400).json('Error: ' + err));
 
})

//starts server
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});