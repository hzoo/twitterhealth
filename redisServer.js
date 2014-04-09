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

module.exports = {
    redis: redis
};
