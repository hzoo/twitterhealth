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

var TimeSeries = require('redis-timeseries'),
ts = new TimeSeries(redis, 'states');
ts.granularities = {
    // '1second'  : { ttl: ts.minutes(12), duration: 1 },
    // '5seconds'  : { ttl: ts.hours(1)  , duration: 5  },
    // '10seconds'  : { ttl: ts.hours(2)  , duration: 10 },
    // '30seconds'  : { ttl: ts.hours(6)  , duration: 30 },
    // '1minute'  : { ttl: ts.hours(42)  , duration: ts.minutes(1) },
    // '5minutes' : { ttl: ts.days(2.5) , duration: ts.minutes(5) }
    '15minutes': { ttl: ts.days(14)   , duration: ts.minutes(15) },
    '30minutes': { ttl: ts.days(14)   , duration: ts.minutes(30) },
    '1hour'    : { ttl: ts.days(14)   , duration: ts.hours(1) },
    '1day'     : { ttl: ts.weeks(2) , duration: ts.days(1) }
};

module.exports = {
    ts: ts,
    redis: redis
};
