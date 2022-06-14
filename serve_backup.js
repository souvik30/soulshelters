const express = require('express');
const app = express();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const routes= require('./routes/routes');
const signup=require('./models/signupmodel');
const cors=  require('cors');
dotenv.config();
mongoose.connect(process.env.DB_CONNECTION, ()=> console.log('connected to db'));
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use('/css',express.static(__dirname + '/public/css'));
app.use('/js',express.static(__dirname + '/public/js'));
app.use('/icons',express.static(__dirname + '/public/icons'));
app.use('/image',express.static(__dirname + '/public/image'));
app.get('',(req,res)=>{
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/signup',async (req,res)=>{
    console.log(req);
    console.log(res);
    /*const signupdetails = new signup({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    });
    await signup.create(signupdetails);*/
    res.send(req.body);
})

app.post("/register", async (req,res)=>{
    try{
        const password = req.body.password;
        const cpassword = req.body.cpassword;
        if(password === cpassword){
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                password: req.body.password
            });
            await user.save();
            res.send("User Created");
        }else{
            res.send("Password does not match");
        }
    }
    catch(err) {
        console.error(err);
    }
})

app.listen(4000, () => console.log('app listening on port 4000!'));
