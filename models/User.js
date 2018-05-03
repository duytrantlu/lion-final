const mongoose = require('mongoose'),
    uniqueValidator = require('mongoose-unique-validator'),
    crypto = require('crypto'),
    secret = require('../config').secret,
    jwt = require('jsonwebtoken');


let UserSchema = new mongoose.Schema({
    username: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
    email: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true },
    bio: String,
    image: String,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hash: String,
    salt: String
}, { timestamps: true });

UserSchema.plugin(uniqueValidator, { message: 'is already taken.' });

UserSchema.methods.validPassword = function (password) { // tạo phương thức validPassword() cho schema
    var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UserSchema.methods.setPassword = function (password) { // tạo phương thức setPassword() cho schema
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.generateJWT = function () { // tạo phương thức generateJWT() cho schema
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 60);
    return jwt.sign({
        id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000)
    }, secret);
};

UserSchema.methods.toAuthJSON = function () { // tạo phương thức toAuthJSON() cho schema
    return {
        username: this.username,
        email: this.email,
        token: this.generateJWT(),
        bio: this.bio,
        image: this.image
    };
};
UserSchema.methods.toProfileJSONFor = function (user) { // tạo phương thức toProfileJSONFor() cho schema
    return {
        username: this.username,
        bio: this.bio,
        image: this.image || 'https://www.sideshowtoy.com/wp-content/uploads/2017/12/marvel-the-incredible-hulk-life-size-bust-sideshow-silo-400303.png',
        following: user ? user.isFollowing(this._id) : false
    };
};

UserSchema.methods.favorite = function (id) { // tạo phương thức favorite() cho schema
    if (this.favorites.indexOf(id) === -1) {
        this.favorites.push(id);
    }
    return this.save();
};

UserSchema.methods.unfavorite = function (id) { // tạo phương thức unfavorite() cho schema
    this.favorites.remove(id);
    return this.save();
};

UserSchema.methods.isFavorite = function (id) { // tạo phương thức isFavorite() cho schema
    return this.favorites.some(function (favoriteId) {
        return favoriteId.toString() === id.toString();
    });
};

UserSchema.methods.follow = function (id) { // tạo phương thức follow() cho schema
    if (this.following.indexOf(id) === -1) {
        this.following.push(id);
    }

    return this.save();
};

UserSchema.methods.unfollow = function (id) { // tạo phương thức unfollow() cho schema
    this.following.remove(id);
    return this.save();
};

UserSchema.methods.isFollowing = function (id) { // tạo phương thức isFollowing() cho schema
    return this.following.some(function (followId) {
        return followId.toString() === id.toString();
    });
};

mongoose.model('User', UserSchema);
