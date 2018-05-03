const express = require('express'),
    methods = require('methods'),
    app = express(),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    cors = require('cors'),
    passport = require('passport'),
    errorhandler = require('errorhandler'),
    mongoose = require('mongoose');

let isProduction = process.env.NODE_ENV === 'production';

//setting cors
app.use(cors());

//setting body-parser
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//passport authenticate init
app.use(passport.initialize());
app.use(passport.session());


app.use(require('method-override')());
//setting session
app.use(session(
    {
        secret: 'lion',
        cookie: { maxAge: 60000 },
        resave: false,
        saveUninitialized: false
    }
));

//setting errorhandle
if (!isProduction) {
    app.use(errorhandler());
}

//setting connect mongo
if (isProduction) {
    mongoose.connect(process.env.MONGODB_URI);
} else {
    const url = "mongodb://bloglion:123456@ds111410.mlab.com:11410/lion";
    mongoose.connect(url);
    mongoose.set('debug', true); //log debug query
}

require('./models/User');
require('./models/Article');
require('./models/Comment');
require('./config/passport');

app.use(require('./routers'));


/// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    //console.log(err);
    next(err);
});

//handle error 

// development error handler
if (!isProduction) {
    app.use(function (err, req, res, next) {
        //console.log('err.stack',err.stack);

        res.status(err.status || 500);

        res.json({
            'errors': {
                message: err.message,
                error: err
            }
        });
    });
}
// development error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    //console.log('err', err);
    res.json({
        'errors': {
            message: err.message,
            error: {}
        }
    });
});

// finally, let's start our server...
var server = app.listen( process.env.PORT || 3001, function(){
    console.log('Listening on port ' + server.address().port);
  });

