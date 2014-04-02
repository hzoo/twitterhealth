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

//addTweet(tweetData,'sick');
function addTweet(tweetData, type) {
    var value = tweetData.state + tweetData.timeStamp + tweetData.text;
    if (type === 'sick') {
        redis.zadd('sick',tweetData.timeStamp,value);
    } else if (type === 'not') {
        redis.zadd('not',tweetData.timeStamp,value);
    } else {
        redis.zadd('dono',tweetData.timeStamp,value);
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
};
