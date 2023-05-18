const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FileReader = require('filereader');
// const passport = require('passport');
// const LocalStrategy = require("passport-local");
// const passportLocalMongoose =
// require("passport-local-mongoose");



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

//code to connect to mongoDB--------------
const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})

//login/signup session connection code----------
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

app.use(flash());

//routes to user router documents, only works for direct submissions to database (can't use frontEnd form)
const usersRouter = require('./routes/users');

app.use('/users', usersRouter);

//declare root as index.ejs page
app.get("/", (req, res) =>{
    res.render("index.ejs", {message: req.flash("message"), messageTitle: req.session.messageTitle});
});

//authentication function variable=========================================
const isAuth = (req, res, next) => {
    if(req.session.isAuth){//if session authentication is true, go to next function 
        next()
    }
    else{//direct to root route
        req.flash("message", "");
        req.session.messageTitle = "Welcome back!";
        res.redirect("/");
        console.log("logged in: " + req.session.isAuth);
    }
}

//require the user model needed-----------
let User = require('./models/user.model');//require the user model needed
let Notes = require('./models/notes.model');//require the notes model needed
let UserBackground = require('./models/userBackgrounds.model');//require the backgrounds model needed
const { Store } = require('express-session');

//===================SIGN UP FUNCTION===============================================
app.post("/sign_up", async (req,res) => {
    const username = req.body.newUsername;//username inserted to form
    const password = req.body.newPassword;//password inserted to form

    let user = await User.findOne({username: username});//check user collection for username

    if (user){//if username already exists
        console.log("user already exists.");
        req.flash("message", "User already exists. Please choose a differnt username or log in.");
        req.session.messageTitle = "Oops...";
        return res.redirect("/");//rediredirect to home page
    }
    else{//if username does not yet exist, prepare new user

        const hashedPW = await bcrypt.hash(password, 10);//hash password with salt of 10 times encryption
        user = new User({
            username,
            password: hashedPW
        })

        await user.save();//save new user to DB
        req.flash("message", "Please submit credentials to log in.");
        req.session.messageTitle = `Welcome ${username}!`;
        res.redirect('/');//redirect to root page***change to redirect to home/landing page
    }
})
//======================LOGIN FUNCTION========================================
app.post("/login", async (req,res)=>{
    const username = req.body.username;//username inserted to form
    const password = req.body.password;//password inserted to form

    let user = await User.findOne({username: username});//check user collection for username

    //console.log("located user for login: " + user);

    if (!user){//if the user does not exsist, return to the home page
        console.log("not a user");
        req.flash("message", "User does not exist. Please check and re-enter username and password or create an account to log in.");
        req.session.messageTitle = "Oops...";
        return res.redirect("/");
    }

    const isMatch = await bcrypt.compare(password, user.password);//compares input password with hashed password

    if(!isMatch){//if the password doesn't match, return user to home page
        console.log("not matched");
        req.flash("message", "Username or password incorrect. Please check and re-enter username and password to log in.");
        req.session.messageTitle = "Oops...";
        return res.redirect("/");
    }
    req.session.isAuth = true;
    req.session.username = username;
    req.session.userID = user._id;
    console.log(user._id);
    res.redirect("/notes");
})

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

var sessionuser = req.session.username;//session user's name
var userID = req.session.userID;

    console.log(sessionuser);
let notes = await Notes.findOne({username: sessionuser});//check user collection for username
let bgPhoto = await UserBackground.find({userID: userID});
// console.log("bgPhoto.length: " + bgPhoto.length);
// console.log("bgPhoto.length: " + bgPhoto);
// console.log("bgPhoto.image.contentType:" + bgPhoto.image.contentType);
// console.log("bgPhoto.image.data:" + bgPhoto.image.data);
//var photovariable = (bgPhoto.length == 0) ? "flower.jpg": bgPhoto.image;
//var decodedImage = "userBackgrounds/" + bgPhoto[0].image.data;
var photovariable = (bgPhoto.length == 0)? "flower.jpg":"userBackgrounds/" + bgPhoto[0].image.data;
console.log("photovariable: " + photovariable);
console.log("photovariable single out: " + photovariable);


if (notes){//if notes already exist for user, load to page
        console.log("notes already exist: " + notes.notes);
        console.log("session username: " + sessionuser);
        //call back notes submitted to database-------------
        return res.render("notes.ejs", 
        //------------NOTES DOCUMENT------------//
        {
        notes: notes.notes,
        //---------------USER INFO--------------//
        name: sessionuser,
        photo: photovariable
        });//, photo: photovariable

    }
else{//if notes do not yet exist for user, render empty notes document
        return res.render("notes.ejs", 
        //------------NOTES DOCUMENT------------//
        {
        notes: "", 
        //---------------USER INFO--------------//
        name: sessionuser,
        photo: photovariable
        });//, photo: photovariable
    }
    
})

//==============================SUBMIT NOTES TO DATABASE==============================
app.post("/submit_notes",async (req,res)=>{

var sessionuser = req.session.username;
var textnotes = req.body.notes;
console.log(sessionuser);
let notes = await Notes.findOne({username: sessionuser});//check notes collection for username

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

//======================UPDATE BACKGROUND PHOTO==================================  

const Storage = multer.diskStorage({
    destination: 'public/userBackgrounds',
    filename: (req,file,cb)=>{
        cb(null,file.originalname)
    }
})

const upload = multer({
    storage:Storage
}).single('uploadInputTag');

app.post("/background", async (req,res)=>{
    //declare variables
    var sessionuser = req.session.userID;

    let photo = await UserBackground.find({userID: sessionuser});//check user background photo collection for userID
    //if no photo located for user, insert photo as user photo
    if (photo.length == 0){
        
        upload(req,res,(err)=>{
            if(err){
                console.log(err);
            }
            else{
                const newImage = new UserBackground({
                    userID: sessionuser,
                    image: {
                        data:req.file.filename,
                        contentType: "image/jpg"
                    }
                })
                newImage.save()
                .then(()=>res.redirect("/notes"))
                .catch(err=>{console.log(err)});
            }
        })
    }//end of if (photo.length == 0)
    //update user photo: update photo in user db, remove previous photo from folder and insert newly selected photo 
    else{

        //1. delete previous file
        fs.unlink("userBackgrounds/" + photo[0].image.data, (err => {
            if (err) console.log(err);
            else {
              console.log("Deleted file: " + photo[0].image.data);
            }
          }));//end of fs.unlink()//does not yet remove file

        let remvPhoto = await UserBackground.findOneAndDelete({userID: sessionuser});
        
        //2. update and insert new file
            upload(req,res,(err)=>{
                if(err){
                    console.log(err);
                }
                else{
                    const newImage = new UserBackground({
                        userID: sessionuser,
                        image: {
                            data:req.file.filename,
                            contentType: "image/jpg"
                        }
                    })
                    newImage.save()
                    .then(()=>res.redirect("/notes"))
                    .catch(err=>{console.log(err)});
                }
            })
        //prepare update object for photo
        // var newObj = {
        //     data:req.file.filename,
        //     contentType: "image/jpg"
        // }
        // let updatedPhoto = await UserBackground.findOneAndUpdate({userID: sessionuser}, {image: newObj});

        res.redirect("/notes");
    }
});//end of app.post("/background",...);


//======================UPDATE ACCT INFORMATION===================================
//======================UPDATE USERNAME===========================================
app.post("/editUsername", async (req,res)=>{//this froze the DB**,did update username in notes collection, include update for sessionuser's name

    var sessionuser = req.session.username;
    var editedUserName = req.body.editedusername;
    var currentPW = req.body.currentPWEditUN;

    console.log(sessionuser);//current username

    let specificUser = await User.find({username: sessionuser});//find current user in database
    let newUsername = await User.find({username: editedUserName});//find, if available, proposed new username in database

    console.log("specific user: " + specificUser);//check which user was located
    
    const isMatch = await bcrypt.compare(currentPW, specificUser[0].password);//compares input password with hashed password

    if(!isMatch){//if the password doesn't match, return user to notes page**insert flash error here**
        console.log("Password does not match for user update");
        return res.redirect("/notes");
    }

    else{

        console.log("This username already taken in database: " + newUsername);//display attempted username if it was already taken in the users collection

        if (newUsername ==""){//if new entered username does not yet exist in user collection, update username in user and notes collections (because all usernames from notes collections are inherited from users collection)
            console.log("new username not yet used in user database");
            //take the current username from users and notes collections and update it to the new entered username-------------
            
            let specificUserNotes = await Notes.findOneAndUpdate({username: sessionuser}, { username: editedUserName });//update username in notes collection
            let specificUserUpdate = await User.findOneAndUpdate({username: sessionuser}, { username: editedUserName });//update username in users collection

            req.session.username = editedUserName;
            //reload session to contain new username
            req.session.reload(function(err) {
                console.log(err);
              })

        }

        return res.redirect('/notes');//stay on notes page
    }

});
    
//================UPDATE PASSWORD======================================
app.post("/editPassword", async (req,res)=>{
    const username = req.session.username;//name of user for current session
    const oldPW = req.body.oldPassword;//what the user entered to be the current DB passowrd for their acct
    const newPW = req.body.newPassword;//what the user entered for new passoword
    const confirmNewPW = req.body.reEnteredNewPWD;//what the user re-entered for new passoword

    let user = await User.findOne({username: username});//check user collection for username

    const isMatch = await bcrypt.compare(oldPW, user.password);//compares input password with hashed password

    if(!isMatch){//if the password doesn't match, do not submit, stay on user page
        console.log("not matched");
        return res.redirect("/notes");
    }
    else if (isMatch){//if the password does match, check for matching re-entered passwords
        if(newPW === confirmNewPW){//if re-entered passwords do match, submit new password to DB
            const hashedPW = await bcrypt.hash(confirmNewPW, 10);//hash password with salt of 10 times encryption
            user.password = hashedPW;
            await user.save();//save updated password to DB 
            return res.redirect("/notes");//stay on notes page
        }
        else{
            console.log("not matched");
            return res.redirect("/notes");//stay on notes page
        }
    }
    
})

//===================DELETE ACCOUNT=============================================
app.post("/deleteAcct", async (req,res)=>{
    var password = req.body.deleteAcctuserPW;
    var username = req.session.username;
    
    let user = await User.findOne({username: username});//check user collection for username
    console.log("user located for delete" + user);
    const isMatch = await bcrypt.compare(password, user.password);//compares input password with hashed password
    
        if(!isMatch){//if the password doesn't match, do not submit, stay on user page
            console.log("not matched");
            return res.redirect("/notes");
        }
        else if(isMatch){//if the password does match, check for matching re-entered passwords
                console.log("user to be deleted: " + user);
                await User.findOneAndDelete({username: username});
                await Notes.findOneAndDelete({username: username});
                req.session.destroy((err)=>{
                    if(err){
                        console.log("Error: " + err);
                    }});
                console.log("user deleted: " + user);
                return res.redirect("/");//stay on notes page
            }
            
    })




//=========================START SERVER=================================
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});