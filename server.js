//packages
var dotenv = require('dotenv'),
twitter = require('ntwitter'),
jf = require('jsonfile');

var express = require('express');
var app     = express();
var server  = require('http').createServer(app),
io          = require('socket.io').listen(server);
dotenv.load();
io.set('log level', 1);

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

//twitter
var t = new twitter({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token_key:     process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET
});

//redis client
// var redis   = require('redis'), client;
// if (process.env.REDISTOGO_URL) {
//   // TODO: redistogo connection
//   var rtg = require('url').parse(process.env.REDISTOGO_URL);
//   client  = require('redis').createClient(rtg.port, rtg.hostname);
//   client.auth(rtg.auth.split(':')[1]);
// } else {
//   client  = require('redis').createClient();
// }

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
    state: state,
    id: tweet.id_str
  };
  return tweet_msg;
}

io.sockets.on('connection', function (socket) {
  socket.emit("updated_states");
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
