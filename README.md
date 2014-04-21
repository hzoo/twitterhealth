[TwitterHealth](http://twitterhealth.herokuapp.com/)
============

![](http://i.imgur.com/JwwlEyA.png)

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

JS libraries used: socket.io, jquery, intro.js, topojson, d3, cubism
