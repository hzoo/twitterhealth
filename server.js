//packages
var dotenv = require('dotenv'),
twitter = require('ntwitter'),
jf = require('jsonfile');
dotenv.load();

var redisServer = require('./redisServer.js');
var express = require('express');
var app     = express();
var server  = require('http').createServer(app),
io          = require('socket.io').listen(server);
io.set('log level', 1);
io.set('transports', ['websocket']);

//server
var port    = process.env.PORT || 5000; // Use the port that Heroku provides or default to 5000
server.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/app/index.html');
});

app.use("/", express.static(__dirname + '/app'));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
app.use(express.compress());

app.configure('production', function(){
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

//twitter
var t = new twitter({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token_key:     process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET
});

console.log(process.env.CONSUMER_KEY);

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

function getTweetInfo(tweet, state) {
  'use strict';
  var tweet_msg = {
    screen_name:  tweet.user.screen_name,
    text:  tweet.text,
    coordinates: tweet.coordinates.coordinates,
    place_name: tweet.place.full_name,
    timeStamp: Date.now().toString(),
    state: state,
    id: tweet.id_str
  };
  return tweet_msg;
}

io.sockets.on('connection', function (socket) {
  socket.emit("updated_states");

  socket.on('classfyTweet', function(type, tweet) {
    redisServer.addTweet(tweet, type);
  });

  socket.on('getTweets', function() {
    redisServer.getTweets('sick','-inf','+inf');
  });

});

var tweet_stream;
function getStream() {
  'use strict';
  t.stream(
    'statuses/filter',
    { track: trackWords },
    // {'locations': ['-180','15','19','72']}, //usa
    function(stream) {
        tweet_stream = stream;
        stream.on('data', function(tweet) {

          if (tweet.place && tweet.place.country_code === "US" && tweet.geo) {
            var state = (tweet.place.full_name.split(',')[1]);
            if (state)
              state = state.trim();
            //assert length
            if (state !== undefined && state !== "US" && state.length == 2) {
              var tweet_data = getTweetInfo(tweet,state);
              console.log(tweet_data);

              io.sockets.volatile.emit('getTweet', tweet_data);
            }
          }
        });

        stream.on('error', function(tweet) {
            console.log('stream err: ' + tweet);
        });
         stream.on('end', function(tweet) {
            console.log('stream end: ' + tweet);
        });
        stream.on('destroy', function(tweet) {
            console.log('stream destroy: ' + tweet);
        });
    }
  );
}

getStream();
