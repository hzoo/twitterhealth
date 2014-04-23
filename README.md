[TwitterHealth](http://twitterhealth.herokuapp.com/)
============

A webapp to gather 'sickness' related tweet data.

![](http://i4.minus.com/ibmjeJLRAFCB0Q.png)

##Features##
- Crowdsource the classification of tweets by allowing users to read tweets and choose if a tweet's content is related to being sick or not.
- Display a visualization of sick tweets across the US
    - show the choropleth by density (# of sick tweets / population)
    - show the choropleth as compared to the average (compare the current amount of tweets in 15 minutes with the average)
- Display a visualization of US/state tweets over the last week. 
- mobile/responsive, put it online

![](http://i4.minus.com/ipnCkYM5zOHAB.png)

##Guide##
To Install:
- install [node.js](http://nodejs.org/)
- download this repo (`git clone` or download the [zip file](https://github.com/eltacodeldiablo/tweet-health.git))
- cd to the folder and run `npm install`
- create an `.env` file (add with your twitter/api credentials)
- use seperate twitter api keys for production and development if you don't want to get errors/rate limited.
- you can use firebase (100mb free) to store the classified tweets/classifier.
- rediscloud for production (25mb free)

```javascript
//.env
CONSUMER_KEY=
CONSUMER_SECRET=
ACCESS_TOKEN=
ACCESS_TOKEN_SECRET=
DEV_CONSUMER_KEY=
DEV_CONSUMER_SECRET=
DEV_ACCESS_TOKEN=
DEV_ACCESS_TOKEN_SECRET=
FIREBASE_SECRET=
REDISCLOUD_URL=
```

To Run:
- run `node server`
- go to `localhost:5000` in your browser

To Build:
- run 'gulp'

To deploy on heroku:
- add the free rediscloud addon
- add `heroku config:set NODE_ENV=production`
- add all environment variables
    - example: use `heroku config:set CONSUMER_SECRET=KEYHERE`
- to use gulp on heroku
    - add environment variable: `BUILDPACK_URL=https://github.com/timdp/heroku-buildpack-nodejs-gulp.git`
- run git push heroku (assuming you added the repo link)

