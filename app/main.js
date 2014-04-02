/* global io */
var isInitialized = false;
var width      = 960;
var height     = 500;
var projection = d3.geo.albersUsa();
var path = d3.geo.path().projection(projection);
var tweetLocations = [];
var active = d3.select(null);
var tweetDensity;

//socket.io
if (location.host.split(':')[0] === 'localhost') {
    var socket = io.connect('http://localhost:5000');
} else {
    var socket = io.connect(location.host);
}

var area = {'AL':4822.023,'AK':731.449,'AZ':6553.255,'AR':2949.131,'CA':38041.430,'CO':5187.582,'CT':3590.347,'DE':917.092,'DC':632.323,'FL':19317.568,'GA':9919.945,'HI':1392.313,'ID':1595.728,'IL':12875.255,'IN':6537.334,'IA':3074.186,'KS':2885.905,'KY':4380.415,'LA':4601.893,'ME':1329.192,'MD':5884.563,'MA':6646.144,'MI':9883.360,'MN':5379.139,'MS':2984.926,'MO':6021.988,'MT':1005.141,'NE':1855.525,'NV':2758.931,'NH':1320.718,'NJ':8864.590,'NM':2085.538,'NY':19570.261,'NC':9752.073,'ND':699.628,'OH':11544.225,'OK':3814.820,'OR':3899.353,'PA':12763.536,'PR':3667.084,'RI':1050.292,'SC':4723.723,'SD':833.354,'TN':6456.243,'TX':26059.203,'UT':2855.287,'VT':626.011,'VA':8185.867,'WA':6897.012,'WV':1855.413,'WI':5726.398,'WY':576.412};

var svg = d3.select('#chart')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

var states = svg.append('g')
    .attr('class', 'states');

var color = d3.scale.linear()
    .range(['rgb(247,251,255)','rgb(8,48,107)']);

var isTweetDisplayed = false;
var tweet;

function reset() {
    active.classed('active', false);
    active = d3.select(null);

    states.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');
}

svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height)
    .on('click', reset);

function clicked(d) {
    if (active.node() === this) {
        return reset();
    }
    active.classed('active', false);
    active = d3.select(this).classed('active', true);

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = 0.9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    states.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
}

d3.json('us-named.json', function(error, us) {
    states.selectAll('path')
    .data(topojson.feature(us, us.objects.states).features)
        .enter().append('path')
        .attr('d', path)
        .attr('class', 'state')
        .attr('id', function(d) { return d.properties.name;})
      . on('click', clicked);
});

function getResetStates() {
    return {'AL' : 0,'AK' : 0,'AZ' : 0,'AR' : 0,'CA' : 0,'CO' : 0,'CT' : 0,'DE' : 0,'DC' : 0,'FL' : 0,'GA' : 0,'HI' : 0,'ID' : 0,'IL' : 0,'IN' : 0,'IA' : 0,'KS' : 0,'KY' : 0,'LA' : 0,'ME' : 0,'MD' : 0,'MA' : 0,'MI' : 0,'MN' : 0,'MS' : 0,'MO' : 0,'MT' : 0,'NE' : 0,'NV' : 0,'NH' : 0,'NJ' : 0,'NM' : 0,'NY' : 0,'NC' : 0,'ND' : 0,'OH' : 0,'OK' : 0,'OR' : 0,'PA' : 0,'RI' : 0,'SC' : 0,'SD' : 0,'TN' : 0,'TX' : 0,'UT' : 0,'VT' : 0,'VA' : 0,'WA' : 0,'WV' : 0,'WI' : 0,'WY' : 0,'PR' : 0};
}

function updatePoints(data) {
    var text = states.selectAll('circle')
        .data(data, function(d) { return d.id; });

    text.enter().insert('svg:circle')
      .attr('cx', function(d) { return d.coord[0]; })
      .attr('cy', function(d) { return d.coord[1]; })
      .attr('r', 0)
      .style('opacity', 0)
      .style('fill', 'yellow')
      .attr('id', function(d){ return 'tweet-' + d.id;})
    .transition()
      .duration(500)
      .attr('r',15)
      .style('opacity', 0.5)
    .transition()
      .delay(500)
      .duration(500)
      .attr('r',5)
      .style('fill','#F2762E');

    text.exit().transition()
        .duration(function(d,i) { return i * 10 + 100;})
            .style('opacity', 0)
        .remove();
}

function initialize() {
    //reset
    tweetLocations = [];
    updatePoints([]);
    d3.timer.flush();
    tweetDensity = getResetStates();

    color.domain([0, d3.max(d3.values(tweetDensity))]);

    states.selectAll('path')
        .transition()
        .duration(500)
        .style('fill', color(0));

    isInitialized = true;
}

socket.on('updated_states', function () {
    initialize();
});

// function wordMatches(text,words) {
//     if (words.length === 0) {
//         return false;
//     }
//     for (var i = 0;i < words.length; i++) {
//         var textLC = text.toLowerCase();
//         var wordsLC = words[i].toLowerCase();
//         if (textLC.indexOf(wordsLC + ' ') !== -1 || textLC.indexOf(wordsLC + '.') !== -1 || textLC.indexOf('#' + wordsLC) !== -1) {
//             return true;
//         }
//     }
//     return false;
// }

function displayTweet(tweet) {
    // var html = '<div class=\'tweet_info\'>' +
    // '<a class=\'user_link\' href=\'' + 'https://twitter.com/' + tweet.screenName + '\' target=\'_blank\'>' +
    // '<span class =screenname>' + '@' + tweet.screenName + ' </span>' +
    // '</a>' +
    // '<span class =placeName>' + ' from ' + tweet.place_name + ' </span>' +
    // '<p class =text>' + tweet.text + ' </p>' +
    // '</div>';

    var html =
    '<blockquote class=\"twitter-tweet\">' +
    '<a href=\"https://twitter.com/twitterapi/status/' + tweet.id + '\"></a></blockquote>';
    $('#tweet').html(html);
    twttr.widgets.load();
}

socket.on('getTweet', function (sentData) {
    // console.log(sentData.text);

    if (isInitialized) {// && wordMatches(sentData.text,words) === true) {
        var state = sentData.state;
        tweetDensity[state] += 1/area[state];

        color.domain([0, d3.max(d3.values(tweetDensity))]);
        states.selectAll('path')
            .transition()
              .duration(500)
              .style('fill', function(d) {
                    return color(tweetDensity[d.properties.code]);
                });

        if (tweetLocations.length >= 100) {
            tweetLocations.shift();
        }

        tweetLocations.push({
            id: sentData.id,
            abbr: sentData.state,
            // place_name: sentData.place_name,
            coord: projection(sentData.coordinates)
        });

        updatePoints(tweetLocations);
        d3.timer.flush();

        if (!isTweetDisplayed) {
            isTweetDisplayed = true;
            $('.buttons').removeClass('hidden');
            $('#tweet').removeClass('hidden');
            $('.tweet-box').addClass('hidden');
            tweet = sentData;
            displayTweet(sentData);
        }
    }
});

$('.btn-primary').click(function() {
    socket.emit('classfyTweet', 'sick', tweet);
    isTweetDisplayed = false;
    $('#tweet').addClass('hidden');
    $('.tweet-box').removeClass('hidden');
});

$('.btn-danger').click(function() {
    socket.emit('classfyTweet', 'not', tweet);
    isTweetDisplayed = false;
    $('#tweet').addClass('hidden');
    $('.tweet-box').removeClass('hidden');
});

$('.btn-warning').click(function() {
    socket.emit('classfyTweet', 'dono', tweet);
    isTweetDisplayed = false;
    $('#tweet').addClass('hidden');
    $('.tweet-box').removeClass('hidden');
});

$('#getTweets').click(function() {
    socket.emit('getTweets');
});
