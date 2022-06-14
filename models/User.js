const mongoose = require('mongoose');
const User= new mongoose.Schema({
    name:{ type: String, required: true },
    email:{ type: String, required: true, index:true },
    password:{ type: String, required: true },
    user_type:{ type: String, required: true },
    date:{ type: Date, default: Date.now }
})
module.exports=mongoose.model('users',User);