const mongoose = require('mongoose');
module.exports=()=>{
    const url = "mongodb://bloglion:123456@ds111410.mlab.com:11410/lion";
    mongoose.connect(url);
}
