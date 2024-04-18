/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.route('/movies')
    .get(authJwtController.isAuthenticated, (req,res) => {
        //console.log(req.body);
        //es = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        Movie.find({}, function(err, movies){
            if (err) throw err;
            movies.status = 200;
                
            res.json(movies);

        })
        })
    .post(authJwtController.isAuthenticated, (req,res) => {
        //console.log(req.body);
        //es = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        if (o.body.actors=="") {
            return res.status(400).send({success: false, msg: 'Movie needs actors'});
        }
        if (o.body.title=="") {
            return res.status(400).send({success: false, msg: 'Movie needs a title'});
        }
        if (o.body.releaseDate=="") {
            return res.status(400).send({success: false, msg: 'Movie needs a release date'});
        }
        if (o.body.genre=="") {
            return res.status(400).send({success: false, msg: 'Movie needs a genre'});
        }
        else{
            var move = new Movie();
            move.title=o.body.title;
            move.releaseDate=o.body.releaseDate;
            move.genre=o.body.genre;
            move.actors=o.body.actors;

            move.save(function(err){
                if (err) {
                    return res.json(err);
                }
            });            
            o.status = 200;
            o.message = "movie saved";
            o.query = o.body;
            o.env = o.key;
            res.json(o);
        }
    }    
    )
    .all((req, res) => {
        res.status(405).send({ message: "HTTP method not supported."});
    })
    ;

router.route('/movies/:title')
    .get(authJwtController.isAuthenticated, (req,res) => {
        //console.log(req.body);
        //es = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        if (req.query.reviews == "true"){
            Movie.aggregate(([
                {
                    $match: { title: req.params.title}
                },
                {
                    $lookup:{
                        from: 'reviews',
                        localField: '_id',
                        foreignField: 'movieId',
                        as: 'review'
                    }
                },

                {
                    $addFields:{
                        average_rating: { $avg: '$review.rating'}
                    }
                },

                {
                    $sort: { average_rating: -1 }
                }
            ])).exec((err, movies) => {
                if (movies.length==0){
                    return res.status(404).send({success: false, msg: "No movie by that name exists."})
                    }
                res.json(movies)
            })
        }
        
        else{
        Movie.find({title: req.params.title}, function(err, movies){
            if (err) throw err;
            if (movies.length==0){
                    return res.status(404).send({success: false, msg: "No movie by that name exists."})
            }
            else{
                movies.status = 200;
                res.json(movies);
            }
        })
    }
    })


    .delete(authJwtController.isAuthenticated, (req, res) => {
        //console.log(req.body);
        //es = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);

        Movies.findOneAndRemove({title: req.params.title}, function(err){
            if (err) throw err;
            o.status = 200;
            o.message = "movie deleted";
            res.json(o);

        })

        
        
    })
    .put(authJwtController.isAuthenticated, (req, res) => {
        //console.log(req.body);
        //es = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);

        Movies.findOneAndUpdate({ title:req.params.title }, {actors: o.body.actors, genre: o.body.genre, releaseDate: o.body.releaseDate }, function(err){
            if (err) throw err;
            });
            o.status = 200;
            o.message = "movie updated";
            o.query = o.body;
            //o.env = o.key;
            res.json(o);

        })
    
    .all((req, res) => {
        res.status(405).send({ message: "HTTP method not supported."});
    })
    ;

router.route('/movies/:id')
    .get(authJwtController.isAuthenticated, (req,res) => {
        //console.log(req.body);
        //es = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);

        if (req.query.reviews == "true"){
            Movie.aggregate(([
                {
                    $match: { _id: req.params.id}
                },
                {
                    $lookup:{
                        from: 'Review',
                        localField: '_id',
                        foreignField: 'movieId',
                        as: 'reviews'
                    }
                },

                {
                    $addFields:{
                        average_rating: { $avg: '$reviews.rating'}
                    }
                },

                {
                    $sort: { average_rating: -1 }
                }
            ])).exec((err, movies) => {
                if (movies.length==0){
                    return res.status(404).send({success: false, msg: "No movie by that id exists."})
                    }
                res.json(movies)
            })
        }
        
        else{
        Movie.find({_id: req.params.id}, function(err, movies){
            if (err) throw err;
            if (movies.length==0){
                    return res.status(404).send({success: false, msg: "No movie by that id exists."})
                }
            else{
                movies.status = 200;
                res.json(movies);
            }
        })
    }
    })

router.route('/reviews')
    .get((req,res) => {
        //console.log(req.body);
        //es = res.status(200);
        Reviews.find({}, function(err, reviews){
        if (err) throw err;
            reviews.status = 200;
            
            res.json(reviews);

        });
        
    })

    .post(authJwtController.isAuthenticated, (req, res) => {

        var o = getJSONObjectForMovieRequirement(req);
        if (o.body.movieId=="") {
            return res.status(400).send({success: false, msg: 'review needs a movie ID'});
        }
        
        else if (o.body.rating=="" || o.body.rating < 0 || o.body.rating > 5) {
            return res.status(400).send({success: false, msg: 'Review needs rating 0-5'});
        }
        else{
            //let id = ObjectId(o.body.movieId);
            const movid = o.body.movieId;
            Movie.find({_id: movid}, function(err, movie){
                if (!movie){
                        return res.status(404).send({success: false, msg: "Review must have a valid movie Id"});
                }else{
                var review = new Review();
                
                review.movieId = o.body.movieId;
                review.username = o.body.username;
                review.review = o.body.review;
                review.rating = o.body.rating;

                review.save(function(err){
                    if (err) {
                            return res.json(err);
                    }
                })
                
                o.status = 200;
                o.message = 'Review created!';
                o.query = o.body;
                //o.env = o.key;
                res.json(o);
            }
    })
}
    })

    
    
    
    .all((req, res) => {
        res.status(405).send({ message: "HTTP method not supported."});
    });





app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


