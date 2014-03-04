//packages
var dotenv = require('dotenv'),
twitter = require('ntwitter'),
jf = require('jsonfile');
dotenv.load();

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
var tweetFile        = './tweets.json';
var trackWords = [
//generic
'ill','sick','sinus','painful',
//symptoms
'runny nose','sore throat','chills','headache','allergy','inflammation',
'fever','flu','infection','ache','insomnia',
//medicine
'meds', 'medicine'
];
var tweets = [];
var numTweets = 10;

function getTweetInfo(tweet) {
  'use strict';
  var tweet_msg = {
    screen_name:  tweet.user.screen_name,
    text:  tweet.text,
    // created_at:  tweet.created_at,
    // id: tweet.id_str
  };
  return tweet_msg;
}

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

          var tweet_data = getTweetInfo(tweet);

          console.log(tweet_data);

          tweets.push(tweet);

          if (tweets.length === numTweets) {
            jf.writeFile(tweetFile, tweets, function(err) {
              console.log('error:',err);
            })
          }
          // io.sockets.volatile.emit('sendTweet', tweet_data);
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
