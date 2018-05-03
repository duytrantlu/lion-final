var jwt = require('express-jwt');
var secret = require('../config').secret;

function getTokenFromHeader(req) {
  let payload = (req.session.login)
  if(payload){
    return payload;
  }

  return null;
}
var auth = {
  required: jwt({
    secret: secret,
    userProperty: 'payload',
    getToken: getTokenFromHeader
  }),
  optional: jwt({
    secret: secret,
    userProperty: 'payload',
    credentialsRequired: false,
    getToken: getTokenFromHeader
  })
};

module.exports = auth;
