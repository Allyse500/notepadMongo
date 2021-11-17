const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcrypt');
// const passport = require('passport');
// const LocalStrategy = require("passport-local");
// const passportLocalMongoose =
//         require("passport-local-mongoose");



require('dotenv').config();//configures .env file

//setup express server
const app = express();
const port = process.env.PORT || 5000;//define server port

//middleware
app.use(cors());
app.use(express.json());//enables parsing of json
app.use(morgan('short'));
app.use(express.static('./public'));//displays static pages
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})

//login/signup session connection code
var store = new MongoDBStore({
    uri: process.env.ATLAS_URI,
    collection: 'mySessions'
  });

  const secret = process.env.MONGO_SESSION_SECRET;

  app.use(session({
    secret:secret,
    resave: false,
    saveUninitialized: false,
    store: store
}))


//routes to user router documents, only works for direct submissions to database (can't use frontEnd form)
const usersRouter = require('./routes/users');

app.use('/users', usersRouter);

//authentication function variable=========================================
const isAuth = (req, res, next) => {
    if(req.session.isAuth){//if session authentication is true, go to next function 
        next()
    }
    else{//direct to root route
        res.redirect("/");
        console.log("logged in: " + req.session.isAuth);
    }
}

//require the user model needed-----------
let User = require('./models/user.model');//require the user model needed

//sign up function================================================================
app.post("/sign_up", async (req,res) => {
    const username = req.body.newUsername;//username inserted to form
    const password = req.body.newPassword;//password inserted to form

    let user = await User.findOne({username});

    if (user){//if username already exists
        console.log("user already exists.");
        return res.redirect("/");//rediredirect to home page
    }
    else{//if username does not yet exist, prepare new user

        const hashedPW = await bcrypt.hash(password, 10);//hash password with salt of 10 times encryption
        user = new User({
            username,
            password: hashedPW
        })

        await user.save();//save new user to DB
        res.redirect('/');//redirect to root page***change to redirect to home/landing page
    }
})
//login function===========================================================
app.post("/login", async (req,res)=>{
    const username = req.body.username;//username inserted to form
    const password = req.body.password;//password inserted to form

    let user = await User.findOne({username});

    if (!user){//if the user does not exsist, return to the home page
        console.log("not a user");
        return res.redirect("/");
    }

    const isMatch = await bcrypt.compare(password, user.password);//compares input password with hashed password

    if(!isMatch){//if the password doesn't match, return user to home page
        console.log("not matched");
        return res.redirect("/");

    }
    req.session.isAuth = true;
    res.render("notes");
})

//route code that submits new user to mongodb, overlap enabled
// let User = require('./models/user.model');//require the user model needed
// app.post('/sign_up', (req,res) => {
//     console.log("Trying to make a new user");

//     const username = req.body.newUsername;//username inserted to form
//     const password = req.body.newPassword;//password inserted to form

//     const newUser = new User({username, password});//make new user with field info

//     newUser.save()//submit to database
//         .then(() => res.redirect("/"))
//         .catch(err => res.status(400).json('Error: ' + err));
// })

app.post("/logout", (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log("Error: " + err);
            res.redirect("/");
        }
    })
    console.log("Logging out");
    res.redirect("/");
})

app.get("/", (req,res) =>{
    //res.send("Hello from Root");
    res.redirect("/");
})

app.get("/notes", isAuth,  (req,res)=>{
    res.render("notes");
    console.log("reached notes page");
    console.log("is Auth: " + req.session.isAuth);
    
})

//starts server==========================================
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});