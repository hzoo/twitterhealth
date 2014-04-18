[TwitterHealth](http://twitterhealth.herokuapp.com/)
============

![](http://i.imgur.com/JwwlEyA.png)

To Install:
- install [node.js](http://nodejs.org/)
- download this repo (`git clone` or download the [zip file](https://github.com/eltacodeldiablo/tweet-health.git))
- cd to the folder and run `npm install`
- create the `.env` file (just copy .env-sample and replace it with your twitter credentials)
- use seperate twitter api keys for production and development if you don't want to get errors/rate limited.
- you can use firebase (100mb free) to store the classified tweets/classifier.
- rediscloud for production (25mb free)

```javascript
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
