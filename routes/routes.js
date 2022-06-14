const express = require('express');
const router = express.Router();
const signup=require('../models/signupmodel');
router.post('/signup',(req,res)=>{
    /*const signupdetails = new signup({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    });
    signupdetails.save().then(result=>{
        res.status(200).json({
            message: "Signup Successfull",
            result: result
        });
    }).catch(err=>{
        res.status(500).json({
            error: err
        });
    });*/
    res.send(req.body);
})


module.exports = router;