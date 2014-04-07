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
var pop = {'ND': 723393.0, 'NE': 1868516.0, 'NC': 9848060.0, 'HI': 1404054.0, 'PR': 0, 'NM': 2085287.0, 'NJ': 8899339.0, 'NH': 1323459.0, 'NV': 2790136.0, 'AZ': 6626624.0, 'PA': 12773801.0, 'TN': 6495978.0, 'NY': 19651127.0, 'GA': 9992167.0, 'CT': 3596080.0, 'AL': 4833722.0, 'MT': 1015165.0, 'MS': 2991207.0, 'WV': 1854304.0, 'MO': 6044171.0, 'MN': 5420380.0, 'OK': 3850568.0, 'CA': 38332521.0, 'OR': 3930065.0, 'MI': 9895622.0, 'AR': 2959373.0, 'CO': 5268367.0, 'MD': 5928814.0, 'VT': 626630.0, 'MA': 6692824.0, 'AK': 735132.0, 'IA': 3090416.0, 'UT': 2900872.0, 'ID': 1612136.0, 'WY': 582658.0, 'TX': 26448193.0, 'IN': 6570902.0, 'IL': 12882135.0, 'WA': 6971406.0, 'KY': 4395295.0, 'RI': 1051511.0, 'WI': 5742713.0, 'ME': 1328302.0, 'KS': 2893957.0, 'DE': 925749.0, 'FL': 19552860.0, 'SC': 4774839.0, 'DC': 646449.0, 'OH': 11570808.0, 'SD': 844877.0, 'VA': 8260405.0, 'LA': 4625470.0};

var svg = d3.select('#chart')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height);

var states = svg.append('g')
    .attr('class', 'states');

var color = d3.scale.linear()
    .range(['rgb(247,251,255)','rgb(8,48,107)']);

var isTweetDisplayed = false;
var tweet;
var tweetQueue = [];

function reset() {
    active.classed('active', false);
    active = d3.select(null);

    states.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');
}

svg.selectAll('rect')
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
    .data(topojson.feature(us, us.objects.states).features.filter(function(state){
            return state.properties.code !== 'AK';
        }))
        .enter().append('path')
        .attr('d', path)
        .attr('class', 'state')
        .attr('id', function(d) { return d.properties.name;})
        .on('click', clicked);
});

function getResetStates() {
    return {'AL' : [],'AK' : [],'AZ' : [],'AR' : [],'CA' : [],'CO' : [],'CT' : [],'DE' : [],'DC' : [],'FL' : [],'GA' : [],'HI' : [],'ID' : [],'IL' : [],'IN' : [],'IA' : [],'KS' : [],'KY' : [],'LA' : [],'ME' : [],'MD' : [],'MA' : [],'MI' : [],'MN' : [],'MS' : [],'MO' : [],'MT' : [],'NE' : [],'NV' : [],'NH' : [],'NJ' : [],'NM' : [],'NY' : [],'NC' : [],'ND' : [],'OH' : [],'OK' : [],'OR' : [],'PA' : [],'RI' : [],'SC' : [],'SD' : [],'TN' : [],'TX' : [],'UT' : [],'VI': [],'VT' : [],'VA' : [],'WA' : [],'WV' : [],'WI' : [],'WY' : [],'PR' : []};
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

    color.domain([0, 0]);

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
        // tweetDensity[state] += 1/pop[state];
        tweetDensity[state].push({
            id: sentData.id,
            text: sentData.text
        });
        tweetQueue.push({
            id: sentData.id,
            text: sentData.text
        });

        var statesArray = [];
        for (var state in tweetDensity) {
            statesArray.push(state.length);
        }

        color.domain([0, d3.max(statesArray)]);

        states.selectAll('path')
            .transition()
              .duration(500)
              .style('fill', function(d) {
                    return color(tweetDensity[d.properties.code].length);
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
            $('.buttons').children().removeClass('disabled');
            tweet = tweetQueue.shift();
            displayTweet(tweet);
        }
    }
});

function onButtonClick() {
    if (tweetQueue.length <= 1) {
        isTweetDisplayed = false;
        $('#tweet').addClass('hidden');
        $('.tweet-box').removeClass('hidden');
        $('.buttons').children().addClass('disabled');
    }
    tweet = tweetQueue.shift();
    displayTweet(tweet);
}

$('.btn-primary').click(function() {
    socket.emit('classfyTweet', 'sick', tweet);
    onButtonClick();
});

$('.btn-danger').click(function() {
    socket.emit('classfyTweet', 'not', tweet);
    onButtonClick();
});

$('.btn-warning').click(function() {
    socket.emit('classfyTweet', 'dono', tweet);
    onButtonClick();
});

$('#getTweets').click(function() {
    socket.emit('getTweets');
});

$(document).on('keydown', function(event) {
  console.log(event.which);
  if ( event.which === 90 ) {
     event.preventDefault();
     $('.btn-primary').click();
  } else if ( event.which === 88 ) {
     event.preventDefault();
     $('.btn-danger').click();
  } else if ( event.which === 67 ) {
     event.preventDefault();
     $('.btn-warning').click();
  }
});