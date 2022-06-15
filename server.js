var express = require('express');
const mongoSanitize = require('express-mongo-sanitize');
const mime = require('mime-types')
var multer	=	require('multer');
const mongoose = require('mongoose');
var session = require('express-session');
var cookieSession = require('cookie-session');
var cookieparser = require('cookie-parser');
const nodemailer = require("nodemailer");
var hash = require('object-hash');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const passport = require('passport');
const MongoDBStore = require('connect-mongodb-session')(session);
const dotenv = require('dotenv');
let alert = require('alert');
var bodyParser = require('body-parser');
var app = express();
dotenv.config();
const User = require('./models/User');
const Property = require('./models/Property');
const { Cookie } = require('express-session');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/icons', express.static(__dirname + '/public/icons'));
app.use('/image', express.static(__dirname + '/public/image'));
app.get('/', function(req, res) {
    res.render('../views/index', { message: '' });
});
app.use(cookieparser());

app.use(
    mongoSanitize({
      allowDots: true,
      onSanitize: ({ req, key }) => {
        console.warn(`This request[${key}] is sanitized`, req);
      },
    }),
  );

//NODEMAILER TEST ACCOUNT CREATION

const  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.USER,
      pass: process.env.PASS,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN
    }
  });


// send mail with defined transport object

// const  mailOptions = {
//     from: process.env.EMAIL_FROM,
//     to: 'souvikmondal1997@gmail.com', // the user email
//     subject: ' Reset your Password',
//     html: `<h4>Reset Password</h4>
//                    // Here you can add your HTML code.`
//    };

// SEND MAIL OBJECT TEMPLATE

// const  info = transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//         return console.log(error);
//     }
//     console.log("Message sent: %s", info.messageId);
// });

//MONGO DB CONNECTION

mongoose.connect(process.env.DB_CONNECTION, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('connected to db');
    });

//Session store

const store = MongoDBStore({
    uri: process.env.DB_CONNECTION,
    collection: 'sessions'
});


app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

//Session handling

app.use(session({
    secret: '123secret',
    resave: false,
    saveUninitialized: false,
    store: store,
}));


//FORGET PASSWORD RESET



// Sign Up

app.post('/signup', async function(req, res) {
    //console.log(req.body);
    console.log(req.body.otp, req.session.otp);
    const {otp} = req.body;
    const email= req.session.email;
    if (req.session.otp != otp) {
        //console.log("otp verified");
        return res.render('../views/index', { message: 'OTP Verification Failed' });
    }
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
    });
    const { name, signupemail, user_type, password } = req.body;
    const checkEmail = await User.findOne({ email: signupemail });
    if (checkEmail) {
        res.render('../views/index', { message: 'User Exists' });
    } else {
        //hashing Password
        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(password, salt, async function(err, hashedPass) {
                await User.create({ name, email: signupemail, user_type, password: hashedPass });
                alert("Sign UP Successfull");
                //IF DIRECT LOGIN AFTER SIGN UP
                const direct_login = false;


                if (direct_login) {
                    const userdb = await User.findOne({ email: signupemail });
                    req.session.isAuth = true;
                    req.session._id = userdb._id;
                    req.session.user_type = userdb.user_type;
                    console.log({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
                    var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
                    res.cookie('token', token, { maxAge: 900000, httpOnly: true });
                    res.cookie('email', userdb.email, { maxAge: 900000, httpOnly: true });
                    res.cookie('user_type', userdb.user_type, { maxAge: 900000, httpOnly: true });
                    res.cookie('isAuth', true, { maxAge: 900000, httpOnly: true });
                    if (userdb.user_type === 'admin')
                        res.redirect('/dashboard');
                    else if (userdb.user_type === 'cuser') {
                        //NO ADD PROPERTY OPTION
                        res.redirect('/home');
                    } else {
                        //ADD PROPERTY OPTION
                        res.redirect('/home');
                    }
                }
                //IF RETURN TO HOMEPAGE AFTER SIGNUP  
                else {
                    res.redirect('/');
                }
            });
        });

    }
});


//Stay Signed in

app.get('/home', async(req, res) => {
    //console.log(req.cookies.isAuth);
    if (req.cookies.isAuth === 'true') {
        var CookieData = req.cookies;
        const userdb = await User.findOne({ email: CookieData.email });

        var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
        //console.log(token,CookieData.token);
        if (token === CookieData.token) {
            var username = userdb.name;
            var email = userdb.email;
            var user_type = userdb.user_type;
            res.render('../views/home', { username, email, user_type });
        } else {
            res.redirect('/logout');
        }
    } else {
        res.redirect('/');
    }
});

const isAuth = (req, res, next) => {
    if (req.session.isAuth) {
        next();
    } else {
        res.redirect('/');
    }
}

//COOKIE GET

app.get('/cookies', (req, res) => {
    res.send(req.cookies);
});


//DISPLAY SIGN IN/SIGNUP PAGES

app.get('/sign_up', function(req, res) {
    res.render('../views/sign_up', { message: '' });
});
app.get('/log_in', function(req, res) {
    res.render('../views/log_in', { message: '' });
});



//Sign In

app.post('/signin', async function(req, res) {
    
    //console.log(req.body);
 const userdb= await User.findOne({ email: req.body.email });
 //console.log(userdb);
 if (userdb) {
    bcrypt.compare(req.body.password, userdb.password, function(err, result) {
        if (result) {
            req.session.isAuth = true;
            req.session._id = userdb._id;
            req.session.user_type = userdb.user_type;
            //console.log({ user_type:userdb.user_type, email:userdb.email, name:userdb.name, password:userdb.password});
            const token=hash({ user_type:userdb.user_type, email:userdb.email, name:userdb.name, password:userdb.password});
            res.cookie('token',token, {maxAge: 900000, httpOnly: true});
            res.cookie('email',userdb.email, {maxAge: 900000, httpOnly: true});
            res.cookie('user_type', userdb.user_type, { maxAge: 900000, httpOnly: true });
            res.cookie('isAuth',true, {maxAge: 900000, httpOnly: true});
            
            const userTypeMap = {
                'admin': 'dashboard',
                'cuser': 'home',
                'puser': 'home'                
            };
            var username = userdb.name;
            var email = userdb.email;
            var user_type = userdb.user_type;
            res.render(`../views/${userTypeMap[userdb.user_type]}`, { username, email, user_type });
                
        }
        else{

            res.render('../views/index', {message:'Invalid Password'});
        }
    });
 }
 else{
     alert("User Not Found");
     res.redirect('/');
 }
 });


 //MULTER CONFIGURATION

 var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        //console.log(file.mimetype);
        cb(null, Date.now() +"."+ mime.extension(file.mimetype) );
    }
  })
   
  var upload = multer({ storage: storage })

//VERIFY EMAIL

app.post('/emailverify', async function(req, res) {
    if(!req.body.signupemail || !req.body.password){
        return res.status(400).json({error:"Email and password are required"});
        }
            const userdata=req.body;
            console.log(req.body.signupemail);
            const email = req.body.signupemail;
            const otp = Math.floor(100000 + Math.random() * 900000);
            req.session.otp = otp;
            req.session.email = email;
            console.log(otp);
            let testAccount = await nodemailer.createTestAccount();
        
            //SENDING OTP TO USER
        
            const  mailOptions = {
                from: process.env.EMAIL_FROM,
                to: email, // the user email
                subject: 'OTP To Verify Account',
                html: `
                <!doctype html>
        <html lang="en-US">
        
        <head>
            <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
            <title>OTP to Reset Password</title>
            <meta name="description" content="Verify Email Template.">
            <style type="text/css">
                a:hover {
                    text-decoration: underline !important;
                }
            </style>
        </head>
        
        <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
            <!--100% body table-->
            <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
                <tr>
                    <td>
                        <table style="background-color: #f2f3f8; max-width:670px;  margin:0 auto;" width="100%" border="0"
                            align="center" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="height:80px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="text-align:center;">
                                    
                                    <img width="60" src="https://i.ibb.co/rF0nFTq/Favicon.png" title="logo"
                                        alt="logo">
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td style="height:20px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td>
                                    <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                        style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);">
                                        <tr>
                                            <td style="height:40px;">&nbsp;</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:0 35px;">
                                                <h1
                                                    style="color:#1e1e2d; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">
                                                    Thanks for Signing Up on Soulshelters! Please enter the OTP to verify your account</h1>
                                                <span
                                                    style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                                    Here is the OTP to Verify Your Account- <b>${otp}</b>
                                                </p>
                                                <button onclick="myFunction()" style="background:#20e277;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">
                                                    Copy OTP
                                                </button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="height:40px;">&nbsp;</td>
                                        </tr>
                                    </table>
                                </td>
                            <tr>
                                <td style="height:20px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="text-align:center;">
                                    <p
                                        style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">
                                        &copy; <strong>Soul Shelters</strong></p>
                                </td>
                            </tr>
                            <tr>
                                <td style="height:80px;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <input class="input100" type="hidden" value="${otp}" name="copy_otp" id="copy_otp"/>
            <!--/100% body table-->
            <script>
                function myFunction() 
                {
                    var copyText = document.getElementById("copy_otp");
                    copyText.type = 'text';
                    copyText.select();
                    document.execCommand("copy");
                    copyText.type = 'hidden';
                }
            </script>
        </body>
        
        </html>`
               };
        
            //sgMail.send(msg);
            const  info = transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log("Message sent: %s", info.messageId);
                res.render('../views/verifyemail',{userdata});
            });
            
    }
    );

//TEST FOR VERIFICATION OF OTP

app.get('/otptest', function(req, res) {
    res.render('../views/verifyemail');
});


//Property Registration 

 app.post('/property',upload.single('image'), async function(req, res){
    if (req.cookies.isAuth === 'true') {
        var CookieData = req.cookies;
        const userdb = await User.findOne({ email: CookieData.email });
        var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
        //console.log(token,CookieData.token);
        if (token === CookieData.token) {
            if(CookieData.user_type='puser'){
                //console.log(req.body);
                const file = req.file
                
                const optionals = ["laundry","wifi","food","cleaner","security"];
                const query = {};
                optionals.forEach(option =>  {
                    req.body[option] ? query[option] = req.body[option] : query[option]="no";
                });
                if(file)
                {
                    console.log(file.filename);
                    query["image"]=file.filename;
                }
                    
                else
                    query["image"]="N/A";
                //console.log(query);
                let merged = {...req.body, ...query};
                console.log(merged);
                //res.status(201);
                //const { name, email, address, state, city, phone, laundry, wifi, genders, food, cleaners, security, prices } = req.body;
                await Property.create(merged);
                alert("Property Uploaded Successfully");
                //res.sendStatus(201);
                res.redirect('/home');

            }
            else {
                res.redirect('/home');
            }
        } 
    else {
            res.redirect('/logout');
        }
    } else {
        res.redirect('/');
    }
    

});


//UPLOAD IMAGE


  app.post('/upload', upload.single('image'), (req, res, next) => {
    const file = req.file
    if (!file) {
      const error = new Error('Please upload a file')
      error.httpStatusCode = 400
      return next(error)
    }
    console.log(file.filename);
    console.log(req.body.id);
      res.send(file)
    
  });





 // SEARCH PROPERTY
 app.post('/sproperty', async (req, res)=> {
        const {area} = req.body;
        if(!area) return res.sendStatus(404);
        const filters = ["state","city","laundry","wifi","genders","food","cleaner","security"];
        const query = {};
        filters.forEach(filter =>  {
            req.body[filter] ? query[filter] = req.body[filter] : {};
        });
        console.log(query);
        const Properties=await Property.find({$and: [{ $text: { $search: area } },query]});
        console.log(Properties);
        //res.redirect('/home');
        //res.status(200).send(Properties);
        res.render('../views/searchResult',{Properties});
 });

//VERIFY PROPERTY USERS


        

//DISPLAY PROPERTY REGISTRATION PAGE

app.get('/registerproperty', async(req, res) => {
    if (req.cookies.isAuth === 'true') {
        var CookieData = req.cookies;
        const userdb = await User.findOne({ email: CookieData.email });
        var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
        //console.log(token,CookieData.token);
        if (token === CookieData.token) {
            if(CookieData.user_type=='puser'){
                res.render('../views/propertyRegistration',{email:CookieData.email});
            }
            else {
                res.redirect('/home');
            }
        } 
    else {
            res.redirect('/logout');
        }
    } else {
        res.redirect('/');
    }
})


 //SEARCH PROPERTY ADVANCED

 app.get('/search', async (req, res) => {
        console.log(req.body);

 });

 //SEND otp
    app.post('/apisendotp', async (req, res)=> {
        console.log(req.body);
        const {email} = req.body;
        const userdb= await User.findOne({ email: email });
        if (userdb) {
            var otp=Math.floor(1000 + Math.random() * 9000);
            console.log(otp);
            res.send(otp);
        }
        else{
            res.status(404).send("User Not Found");
        }
    });
//EDIT PROPERTY
    //LIST ALL PROPERTIES TO EDIT

        app.get('/myproperties', async (req, res)=> {
            if (req.cookies.isAuth === 'true') {
                var CookieData = req.cookies;
                const userdb = await User.findOne({ email: CookieData.email });
                var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
                //console.log(token,CookieData.token);
                if (token === CookieData.token) {
                    if(CookieData.user_type=='puser'){
                        const Properties=await Property.find({email:CookieData.email});
                        //res.render(Properties);
                        res.render('../views/registeredproperties',{email:CookieData.email,Properties});
                    }
                    else {
                        res.redirect('/home');
                    }
                } 
            else {
                    res.redirect('/logout');
                }
            } else {
                res.redirect('/');
            }

        });
    //SELECT A PROPERTY TO EDIT
        app.get('/editproperty', async (req, res)=> {
            if (req.cookies.isAuth === 'true') {
                var CookieData = req.cookies;
                const userdb = await User.findOne({ email: CookieData.email });
                var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
                //console.log(token,CookieData.token);
                if (token === CookieData.token) {
                    if(CookieData.user_type=='puser'){
                        Property.findOne({_id:req.query.id},function(err,property){
                            if(!property)
                                console.log('not found');
                            if(property.email!=CookieData.email){
                                alert("You are not authorized to edit this property");
                                return res.redirect('/home');
                            }
                            return res.render('../views/editproperty',{property});
                            //return res.render('../views/editpropertylist',{email:CookieData.email,Properties});
                            });
                        //res.render('../views/editpropertylist',{email:CookieData.email,Properties});
                    }
                    else {
                        res.redirect('/home');
                    }
                } 
            else {
                    res.redirect('/logout');
                }
            } else {
                res.redirect('/');
            }
        });


    //UPDATE PROPERTY
        app.post('/updateproperty', async (req, res)=> {
            if (req.cookies.isAuth === 'true') {
                var CookieData = req.cookies;
                const userdb = await User.findOne({ email: CookieData.email });
                var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
                //console.log(token,CookieData.token);
                if (token === CookieData.token) {
                    if(CookieData.user_type=='puser'){

                        const optionals = ["laundry","wifi","food","cleaner","security"];
                        const query = {};
                        optionals.forEach(option =>  {
                            req.body[option] ? query[option] = req.body[option] : query[option]="no";
                        });
                        //console.log(query);

                        let merged = {...req.body, ...query};

                        console.log(merged);
                        const _id=req.body._id;
                        console.log(_id);

                        const propertydb = await Property.findOneAndUpdate({_id:_id},merged);
                        res.redirect('/myproperties');
                    } else {
                        res.redirect('/home');
                    }
                }
                else {
                    res.redirect('/logout');
                }
            } else {
                res.redirect('/');
            }
        });
    //DELETE PROPERTY
    app.delete('/property', async (req, res)=> {
        console.log(req.body);
        if (req.cookies.isAuth === 'true') {
            var CookieData = req.cookies;
            const userdb = await User.findOne({ email: CookieData.email });
            var token = hash({ user_type: userdb.user_type, email: userdb.email, name: userdb.name, password: userdb.password });
            //console.log(token,CookieData.token);
            if (token === CookieData.token) {
                if(CookieData.user_type=='puser'){
                    console.log(req.body.id);
                     const res= await Property.deleteOne({id:req.body.id});
                     console.log(res);
                    //,function(err,property){
                    //     if(!property)
                    //         console.log('not found');
                    //     console.log(property);
                    //     if(property.email!= CookieData.email){
                    //         console.log(property.email,CookieData.email);
                    //         return res.status(404).send("You are not authorized to delete this property");
                    //     }
                    //     return res.send("Deletion Successfull");
                    //     });
                    //res.render('../views/editpropertylist',{email:CookieData.email,Properties});
                }
                else {
                    res.redirect('/home');
                }
            } 
        else {
                res.redirect('/logout');
            }
        } else {
            res.redirect('/');
        }
    });




//SHOW FORGET PASSOWORD PAGE

app.get('/forgetpassword', (req, res) => {
    res.render('../views/forget_password');
});

//RECEIVE OTP REQUEST, GENERATE AND STORE IN SESSION


app.post('/sendOTP', async(req, res) => {
    
    console.log(req.body.email);
    const email = req.body.email;
    const otp = Math.floor(100000 + Math.random() * 900000);
    req.session.otp = otp;
    req.session.email = email;
    console.log(otp);
    let testAccount = await nodemailer.createTestAccount();

    //SENDING OTP TO USER

    const  mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email, // the user email
        subject: 'OTP To Reset Password',
        html: `
        <!doctype html>
<html lang="en-US">

<head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
    <title>OTP to Reset Password</title>
    <meta name="description" content="Reset Password Email Template.">
    <style type="text/css">
        a:hover {
            text-decoration: underline !important;
        }
    </style>
</head>

<body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
    <!--100% body table-->
    <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
        style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
        <tr>
            <td>
                <table style="background-color: #f2f3f8; max-width:670px;  margin:0 auto;" width="100%" border="0"
                    align="center" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="height:80px;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="text-align:center;">
                            
                            <img width="60" src="https://i.ibb.co/rF0nFTq/Favicon.png" title="logo"
                                alt="logo">
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="height:20px;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td>
                            <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);">
                                <tr>
                                    <td style="height:40px;">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 35px;">
                                        <h1
                                            style="color:#1e1e2d; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">
                                            You have
                                            requested to reset your password</h1>
                                        <span
                                            style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                        <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                            Here is the OTP to reset your password- <b>${otp}</b>
                                        </p>
                                        <button onclick="myFunction()" style="background:#20e277;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">
                                            Copy OTP
                                        </button>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="height:40px;">&nbsp;</td>
                                </tr>
                            </table>
                        </td>
                    <tr>
                        <td style="height:20px;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="text-align:center;">
                            <p
                                style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">
                                &copy; <strong>Soul Shelters</strong></p>
                        </td>
                    </tr>
                    <tr>
                        <td style="height:80px;">&nbsp;</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    <input class="input100" type="hidden" value="${otp}" name="copy_otp" id="copy_otp"/>
    <!--/100% body table-->
    <script>
		function myFunction() 
		{
			var copyText = document.getElementById("copy_otp");
			copyText.type = 'text';
			copyText.select();
			document.execCommand("copy");
			copyText.type = 'hidden';
		}
	</script>
</body>

</html>`
       };

    //sgMail.send(msg);
    const  info = transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
        res.render('../views/reset_password');
    });
    
});


//OTP FETCH FROM SESSION, VERIFY AND UPDATE PASSWORD


app.post('/otp/verify', async(req, res) => {
    // console.log(req.body)
    console.log(req.body.otp, req.session.otp);
    const {otp,password} = req.body;
    const email= req.session.email;
    if (req.session.otp == otp) {
        //console.log("otp verified");
        req.session.destroy((err) => {
            if (err) {
                return console.log(err);
            }
        });
        //UPDATE PASSWORD
        console.log(email);
        User.findOne({email}, function(err, user){
            if(err)return handleErr(err);
            bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(password, salt, async function(err, hashedPass) {
                    user.password = hashedPass;
                    user.save(function(err){
                        if(err)return handleErr(err);
                        console.log("PASSWORD UPDATED");
                        alert("Password Reset Success");
                        res.redirect('/');
                        //user has been updated
                      });
                });
            });
            
           });
        //res.send({ status: "ok", message: "otp verified and password updated" });
    } else {
        //console.log("otp not verified");
        alert("OTP Not Verified");
        res.redirect('/');
    }
});

//SEND OTP WITH NODEMAILER



//CHECK EMAIL EXISTS

app.get('/user/:email', async(req, res) => {
    const email = req.params.email;
    const user = await User.findOne({ email: email });
    console.log(user);
    if (user) return res.send({ status: true });
    return res.send({ status: false });
})


//LOGOUT

app.get('/logout', async(req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.clearCookie('id');
        res.clearCookie('token');
        res.clearCookie('email');
        res.clearCookie('isAuth');
        res.clearCookie('connect.sid');
        res.clearCookie('user_type');
        res.redirect('/');
    })
});

//MAPS API TEST

app.get('/map', async(req, res) => {

    const position=req.query;
    console.log(position);
    console.log(req.query);
    //res.send(position);
    res.render('../views/map',{position});
});




//TESTING ENDPOINTS



app.listen(4000, () => console.log('app is listening on port 4000!'));