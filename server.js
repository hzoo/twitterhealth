//packages
var fs = require('fs');
var dotenv = require('dotenv');
var Twat = require('twat');
var async = require('async');
var Firebase = require('firebase');
dotenv.load();

var redisServer = require('./redisServer.js').redis;
var ts = require('./redisServer.js').ts;
var express = require('express');
var app     = express();
var server  = require('http').createServer(app);
var io          = require('socket.io').listen(server);
io.set('log level', 1);
io.set('transports', ['websocket']);

var natural = require('natural');
var classifyCount = 0;
var classifier;

//server
var port    = process.env.PORT || 5000; // Use the port that Heroku provides or default to 5000
server.listen(port, function() {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/app/index.html');
});

app.use('/', express.static(__dirname + '/app'));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
app.use(express.compress());

var twit;
app.configure('development', function() {
    console.log('dev');
    twit = new Twat({
        consumer_key:         process.env.DEV_CONSUMER_KEY,
        consumer_secret:      process.env.DEV_CONSUMER_SECRET,
        access_token:     process.env.DEV_ACCESS_TOKEN,
        access_token_secret:  process.env.DEV_ACCESS_TOKEN_SECRET
    });
});
app.configure('production', function(){
    console.log('prod');
    twit = new Twat({
        consumer_key:         process.env.CONSUMER_KEY,
        consumer_secret:      process.env.CONSUMER_SECRET,
        access_token:     process.env.ACCESS_TOKEN,
        access_token_secret:  process.env.ACCESS_TOKEN_SECRET
    });
    //reduce console logs
    io.set('log level', 0);
    io.enable('browser client minification');  // send minified client
    io.enable('browser client etag');          // apply etag caching logic based on version number
    io.enable('browser client gzip');          // gzip the file
    io.set('transports', [
        'websocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ]);
});

//variables
var trackWords = [
    //generic
    'sick','sinus','painful',
    //symptoms
    'runny nose','sore throat','chills','headache','allergy','inflammation',
    'fever','flu','infection','ache','insomnia',
    //medicine
    'meds', 'medicine'
];

var states = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VI','VT','VA','WA','WV','WI','WY','PR'];
var nTweets = 2;
var lastNTweets = [];

var tweetsRoot = new Firebase('https://twitterhealth.firebaseio.com/');
var classifierRoot = new Firebase('https://thclassifier.firebaseio.com/');

var FirebaseTokenGenerator = require('firebase-token-generator');
var tokenGenerator = new FirebaseTokenGenerator(process.env.FIREBASE_SECRET);
var token = tokenGenerator.createToken({'username': 'admin'});

function getTweetInfo(tweet, state) {
    'use strict';
    var tweetMsg = {
        screenName:  tweet.user.screen_name,
        text:  tweet.text,
        coordinates: tweet.coordinates.coordinates,
        placeName: tweet.place.full_name,
        timeStamp: Date.now().toString(),
        state: state,
        id: tweet.id_str
    };
    return tweetMsg;
}

function addTweet(tweetData, type) {
    if (type === 'sick') {
        classifier.addDocument(tweetData.text, 'sick');
        tweetsRoot.child('tweets').child('sick').push(tweetData);
        classifyCount++;
    } else if (type === 'not') {
        classifier.addDocument(tweetData.text, 'not');
        tweetsRoot.child('tweets').child('not').push(tweetData);
        classifyCount++;
    }
    if (classifyCount >= 5) {
        classifier.train();
        classifyCount = 0;
        classifierRoot.set(JSON.stringify(classifier));
        // classifier.save('classifier.json', function(err, classifier) {
        //     console.log('saved classifier');
        // });
    }
}

function createHandler(command, count, granularityLabel) {
    return function(callback) {
        ts.getHits(command, granularityLabel, count, function(err, data) {
            if (err) {
                console.log('err: ' + err);
            } else {
                var temp = data.map(function(data) {
                        return data[1];
                    });
                callback(null, temp);
            }
        });
    };
}

io.sockets.on('connection', function (socket) {
    socket.emit('lastNTweets', lastNTweets);

    socket.on('classfyTweet', function(type, tweet) {
        addTweet(tweet, type);
    });

    socket.on('getPastTweets', function(data){
        var granularityLabel = '15minutes';//data.step;
        if (ts.granularities.hasOwnProperty(granularityLabel)) {
            var granularityDuration = ts.granularities[granularityLabel].duration;
            // console.log(granularityLabel,granularityDuration);
            async.parallel(states.map(
                function(cmd) {
                    // return createHandler(cmd, 1344, granularityLabel);
                    return createHandler(cmd, 6, granularityLabel);
                }), function(err, data) {
                        socket.emit('history', data);
                    });
            async.parallel(states.map(
                function(cmd) {
                    return function(callback) {
                        ts.getHits(cmd, '1second', 900, function(err, data) {
                            if (err) {
                                console.log('err: ' + err);
                            } else {
                                var temp = data.map(function(data) {
                                    return data[1];
                                }).reduce(function(a, b) {
                                    return a + b;
                                });
                                callback(null, temp);
                            }
                        });
                    }
                }), function(err, data) {
                        socket.emit('history2', data);
                    });
        }
    });

});

function getStream() {
    'use strict';
    twit.stream(
        'statuses/filter',
        { track: trackWords },
        // {'locations': ['-180','15','19','72']}, //usa
        function(stream) {
            stream.on('tweet', function(tweet) {
                if (tweet.place && tweet.place.country_code === 'US' && tweet.geo) {
                    var state = tweet.place.full_name.split(',')[1];
                    if (state) {
                        state = state.trim();
                    }
                    //assert length
                    if (state !== undefined && state !== 'US' && state.length === 2) {
                        var tweetData = getTweetInfo(tweet,state);
                        var type = classifier.classify(tweetData.text);
                        console.log(type + ' ' + tweetData.text);
                        if (type === 'sick') {
                            ts.getHits(state, '1second', 900, function(err, data) {
                                if (err) {
                                    console.log('err: ' + err);
                                } else {
                                    var temp = data.map(function(data) {
                                        return data[1];
                                    }).reduce(function(a, b) {
                                        return a + b;
                                    });
                                    io.sockets.volatile.emit('getTweet', tweetData, temp);
                                    lastNTweets.push(tweetData);
                                    if (lastNTweets.length >= nTweets) {
                                        lastNTweets.shift();
                                    }
                                }
                            });
                            // redisServer.zadd(tweetData.state, Date.now(), tweetData.id);
                            if (app.settings.env === 'production') {
                                ts.recordHit(state).exec();
                            }
                        }
                    }
                }
            });

            stream.on('error', function(error, data) {
                console.log('stream err: ', error, data);
            });
            stream.on('reconnect', function(info) {
                console.log(info.error);    // The error causing reconnection
                console.log(info.attempts); // Number of reconnects attempted
            });
            stream.on('end', function(response) {
                console.log('stream end: ' + response);
                // setTimeout(getStream, 5000);
            });
            stream.on('destroy', function(response) {
                console.log('stream destroy: ' + response);
            });
        }
    );
}

// classifier = natural.BayesClassifier.restore(
//     JSON.parse(fs.readFileSync('classifier.json', 'utf8')));

classifierRoot.on('value', function(snapshot) {
    var val = JSON.parse(snapshot.val());
    classifier = natural.BayesClassifier.restore(val);
    // classifier.addDocument('i hate being sick', 'sick');sj
    // classifier.addDocument('sick of', 'not');
    // classifier.train();
    // classifierRoot.set(JSON.stringify(classifier));
    getStream();
});
