const mongoose = require('mongoose');
const Property= new mongoose.Schema({
    name:{ type: String, required: true },
    email:{ type: String, required: true },
    address:{ type: String, required: true },
    area:{ type: String, required: true},
    latitude:{type:String, required:true},
    longitude:{type:String, required:true},
    state:{ type: String, required: true },
    city:{ type: String, required: true},
    propertyType:{ type: String, required: true},
    image:{ type: String, required: true },
    phone:{ type: Number, required: true},
    laundry:{ type: String, required: true},
    wifi:{ type: String, required: true },
    genders:{ type: String, required : true},
    food:{ type: String, required: true },
    cleaner:{ type: String, required : true},
    security:{ type: String, required: true },
    price:{ type: Number, required: true },
    date:{ type: Date, default: Date.now }
})
Property.index({area: 'text'});
module.exports=mongoose.model('properties',Property);