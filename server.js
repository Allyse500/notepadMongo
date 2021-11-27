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
let Notes = require('./models/notes.model');//require the notes model needed

//sign up function================================================================
app.post("/sign_up", async (req,res) => {
    const username = req.body.newUsername;//username inserted to form
    const password = req.body.newPassword;//password inserted to form

    let user = await User.findOne({username});//check user collection for username

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

    let user = await User.findOne({username});//check user collection for username

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
    req.session.username = username;
    res.redirect("/notes");
})

//submit notes to database, sucessfully updates or inserts new note to DB===============================================
app.post("/submit_notes",async (req,res)=>{

var sessionuser = req.session.username;
var textnotes = req.body.notes;
console.log(sessionuser);
let notes = await Notes.findOne({sessionuser});//check notes collection for username

if (notes){//if notes already exist***place for update
    console.log("notes already exist.");
    //note new text and current session user as for entry-------------
    notes.username = sessionuser;
    notes.notes = textnotes;

    await notes.save();//save updated notes to DB
    return res.redirect("/notes");//stay on notes page
}
else{//if notes do not yet exist, prepare notes document

    //encryption of notes is good but not in this method
    //const hashedPW = await bcrypt.hash(password, 10);//hash password with salt of 10 times encryption
    notes = new Notes({
        username: sessionuser,
        notes: textnotes
    })

    await notes.save();//save new notes to DB
    res.redirect("/notes");//stay on notes page
}

})

//======================UPDATE ACCT INFORMATION===================================
//======================UPDATE USERNAME===========================================
// app.post("/editUsername",async (req,res)=>{//this froze the DB**,did update username in notes collection, include update for sessionuser's name

//     var sessionuser = req.session.username;
//     var editedUserName = req.body.editedusername;
//     console.log(sessionuser);

//     let user0 = await User.findOne({sessionuser});//check users collection for username
//     let user = await Notes.findOne({sessionuser});//check notes collection for username
//     let newUN = await User.findOne({editedUserName});
//     let newUN0 = await Notes.findOne({editedUserName});
//     if (user0 && !newUN0){//if username exists and new entered username not yet used, update username in user collection
//         console.log("username located. new username not yet used");
//         //note new text and current session user as for entry-------------
//         user0.username = editedUserName;
    
//         await user0.save();//save updated username to DB  
//     }

//     if (user && !newUN){//if username exists and new entered username not yet used, update username in notes collection
//         console.log("username located. new username not yet used");
//         //note new text and current session user as for entry-------------
//         user.username = editedUserName;
    
//         await user.save();//save updated username to DB   
//     }

//     return res.end();//stay on notes page
//     })
    
//================UPDATE PASSWORD======================================
// app.post("/editPassword", async (req,res)=>{
//     const username = req.session.username;//name of user for current session
//     const oldPW = req.body.oldPassword;//what the user entered to be the current DB passowrd for their acct
//     const newPW = req.body.newPassword;//what the user entered for new passoword
//     const confirmNewPW = req.body.reEnteredNewPWD;//what the user re-entered for new passoword

//     let user = await User.findOne({username});//check user collection for username

//     const isMatch = await bcrypt.compare(oldPW, user.password);//compares input password with hashed password

//     if(!isMatch){//if the password doesn't match, do not submit, stay on user page
//         console.log("not matched");
//         return res.end();
//     }
//     else if (isMatch){//if the password does match, check for matching re-entered passwords
//         if(newPW === confirmNewPW){//if re-entered passwords do match, submit new password to DB
//             const hashedPW = await bcrypt.hash(confirmNewPW, 10);//hash password with salt of 10 times encryption
//             user.password = hashedPW;
//             await user.save();//save updated password to DB 
//             return res.end();//stay on notes page
//         }
//         else{
//             console.log("not matched");
//             return res.end();//stay on notes page
//         }
//     }
    
// })

//===============LOGOUT FUNCTION========================================
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

// app.get("/", (req,res) =>{
//     //res.send("Hello from Root");
//     res.redirect("/");
// })

//=====================WHAT TO DO WHEN '/NOTES' ROUTE IDENTIFIED====================
app.get("/notes", isAuth,  async (req,res)=>{
    //res.render("notes");
    // console.log("reached notes page");
    // console.log("is Auth: " + req.session.isAuth);

var sessionuser = req.session.username;//session user's name

    console.log(sessionuser);
let notes = await Notes.findOne({sessionuser});//check user collection for username

if (notes){//if notes already exist***place for update
    console.log("notes already exist: " + notes.notes);
    console.log("session username: " + sessionuser);
    //call back notes submitted to database-------------
    res.render("notes.ejs", {notes: notes.notes, name: sessionuser});//{name: sessionuser},

}
    res.end();
})

//starts server==========================================
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});