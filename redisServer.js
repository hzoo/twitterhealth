console.log(process.env.REDISCLOUD_URL);
if (process.env.REDISCLOUD_URL) {
    console.log('url: ' + process.env.REDISCLOUD_URL);
    var redisURL = require('url').parse(process.env.REDISCLOUD_URL);
    var redis = require('redis').createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
    redis.auth(redisURL.auth.split(':')[1]);
    redis.on('error', function(err) { console.log('Error redis: ', err); });
} else {
    console.log('local redis');
    var redis = require('redis').createClient();
}

//addTweet(tweet_data,'sick');
function addTweet(tweet_data, type) {
  var value = tweet_data.state + tweet_data.timeStamp + tweet_data.text;
  if (type == 'sick') {
    redis.zadd('sick',tweet_data.timeStamp,value);
  } else if (type == 'not') {
    redis.zadd('not',tweet_data.timeStamp,value);
  } else {
    redis.zadd('dono',tweet_data.timeStamp,value);
  }
}

function getTweets(type, min, max) {
  redis.zrangebyscore([type,min,max], function(err, res) {
    console.log(res);
  });
}

module.exports = {
  redis: redis,
  addTweet: addTweet,
  getTweets: getTweets
}
