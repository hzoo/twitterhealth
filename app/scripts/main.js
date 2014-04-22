/* global io,twttr,cubism,introJs */
if (location.host.split(':')[0] === 'localhost') {
    var socket = io.connect('http://localhost:5000');
} else {
    var socket = io.connect(location.host);
}
var width      = 960;
var height     = 500;
var mWidth = $('#chart').width();
var projection = d3.geo.albers().translate([width / 2, height / 2]);
var path = d3.geo.path().projection(projection);
var tweetLocations = [];
var active = d3.select(null);

var svg = d3.select('#chart')
    .append('svg')
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr('width', mWidth)
    .attr('height', mWidth * height / width);

svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height);

var states = svg.append('g')
    .attr('class', 'states');

var color = d3.scale.linear()
    // .range(['#f1a340','#f7f7f7','#998ec3']); //orig
    // .range(['#83B331','yellow','B32A0E']);
    .range(['#F2E97A','#F1B668','#732F11']); //orange,brown
    // .range(['#90F96B','#F1CE67','#F9755E']); //green,yellow,red
    // .range(['#F98252','#F13F9F','#8734F9']); //or,pink,purple
    // .range(['#40F941','#4AF1F0','#6674F9']);

var isTweetDisplayed = false;
var tweet;
var tweetQueue = [];
var colorMax = 3;
var colorRange = [-1 * colorMax, 0, colorMax];

d3.json('./assets/us-named-states.json', function(error, us) {
    states.selectAll('path')
    .data(topojson.feature(us, us.objects.states).features.filter(function(state){
            return state.properties.code !== 'AK';
        }))
        .enter().append('path')
        .attr('d', path)
        .attr('class', 'state')
        .attr('id', function(d) { return d.properties.code;})
        .on('click', clicked);

    color.domain(colorRange);
    states.selectAll('path')
        .transition()
        .duration(500)
        .style('fill', color(0));

    socket.emit('getPastTweets');
});

function getResetStates() {
    return {'AL' : [],'AK' : [],'AZ' : [],'AR' : [],'CA' : [],'CO' : [],'CT' : [],'DE' : [],'DC' : [],'FL' : [],'GA' : [],'HI' : [],'ID' : [],'IL' : [],'IN' : [],'IA' : [],'KS' : [],'KY' : [],'LA' : [],'ME' : [],'MD' : [],'MA' : [],'MI' : [],'MN' : [],'MS' : [],'MO' : [],'MT' : [],'NE' : [],'NV' : [],'NH' : [],'NJ' : [],'NM' : [],'NY' : [],'NC' : [],'ND' : [],'OH' : [],'OK' : [],'OR' : [],'PA' : [],'RI' : [],'SC' : [],'SD' : [],'TN' : [],'TX' : [],'UT' : [],'VI': [],'VT' : [],'VA' : [],'WA' : [],'WV' : [],'WI' : [],'WY' : [],'PR' : []};
}
var tweetDensity = getResetStates();

$(window).resize(function() {
    var w = $("#chart").width();
    svg.attr("width", w);
    svg.attr("height", w * height / width);
});

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
        $('#stateTimeline').html('');
        return reset();
    }
    if (window.innerWidth > 768) {
        startGraph(d.properties.code, '#stateTimeline');
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


function updatePoints(data) {
    var text = states.selectAll('circle')
        .data(data, function(d) { return d.id; });

    text.enter().insert('svg:circle')
      .attr('cx', function(d) { return d.coord[0]; })
      .attr('cy', function(d) { return d.coord[1]; })
      .attr('r', 0)
      .style('opacity', 0)
      .style('fill', '#25AAE2')
      .attr('id', function(d){ return 'tweet-' + d.id;})
    .transition()
      .duration(500)
      .attr('r',15)
      .style('opacity', 0.5)
    .transition()
      .delay(500)
      .duration(500)
      .attr('r',5)
      .style('fill','#0F75BD');

    text.exit().transition()
        .duration(function(d,i) { return i * 10 + 100;})
            .style('opacity', 0)
        .remove();
}

function displayTweet(tweet) {
    var html =
    '<blockquote class=\"twitter-tweet\">' +
    '<a href=\"https://twitter.com/twitterapi/status/' + tweet.id + '\"></a></blockquote>';
    $('#tweet').html(html);
    twttr.widgets.load();
}

function showTweets() {
    if (!isTweetDisplayed) {
        isTweetDisplayed = true;
        $('.buttons').removeClass('hidden');
        $('#tweet').removeClass('hidden');
        $('.tweet-box').addClass('hidden');
        $('.buttons').children().removeClass('disabled');
        if (tweetQueue.length > 0) {
            tweet = tweetQueue.shift();
            displayTweet(tweet);
        }
    }
}

socket.on('lastNTweets', function(sentData){
    tweetQueue = sentData;
    showTweets();
});

socket.on('getTweet', function (sentData, tweets15min) {
    // console.log(sentData.text);

    //if tweet is categorized sick by algorithm
    if (tweets15min !== undefined) {
        states.selectAll('path')
        .transition()
          .duration(500)
          .style('fill', function(d) {
                var state = d.properties.code;
                var percentDiff;
                if (tweetAverages[state] !== 0) {
                    percentDiff = (tweets15min[stateArray.indexOf(state)] - tweetAverages[state])/tweetAverages[state];
                    if (percentDiff > colorMax) {
                        percentDiff = colorMax;
                    } else if (percentDiff < -1 * colorMax) {
                        percentDiff = -1 * colorMax;
                    }
                    // console.log(state,data[stateArray.indexOf(state)],tweetAverages[state]);
                } else {
                    percentDiff = 0;
                }
                // console.log(percentDiff);
                return color(percentDiff);
            });

        var state = sentData.state;

        tweetDensity[state][state.length - 1]++;

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
    }

    //show tweet regardless if categorized as sick or not
    if (tweetQueue.length === 0 || tweetQueue[tweetQueue.length-1].id !== sentData.id) {
        tweetQueue.push({
            id: sentData.id,
            text: sentData.text
        });
    }

    showTweets();
});

var stateArray = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VI','VT','VA','WA','WV','WI','WY','PR'];
var tweetAverages = {};

//tweet timeline
//create metric
var step;
var graphSize;
var context;

function command(state) {
    return context.metric(function(start, stop, step, callback) {
        var data;
        if (state === 'all') {
            var total = [];
            var numHistory = tweetDensity[stateArray[0]].length;
            for (var i = 0; i < numHistory; i++) {
                var tempTotal = 0;
                for (var stateTD in tweetDensity) {
                    tempTotal += tweetDensity[stateTD][i];
                }
                total.push([tempTotal]);
            }
            data = total;
        } else {
            data = tweetDensity[state];
        }
        callback(null, data);
    }, state);
}

function startGraph(state, timeline) {
    step = 9e5;
    graphSize = 672;
    context = cubism.context()
        .serverDelay(100)
        .clientDelay(0)
        .step(step)
        .size(graphSize)
        .stop();

    context.on('focus', function(i) {
        d3.selectAll('.value').style('right',                  // Make the rule coincide
            i === null ? null : context.size() - i + 'px'); // with the mouse
    });

    var states = command(state);

    d3.select(timeline).call(function (div) {
        if (state === 'all') {
            //axis
            div.append('div').attr('class', 'axis').call(context.axis().orient('top'));
            //line
            // div.append('div')
            //     .attr('class', 'rule')
            //     .call(context.rule());
        }
        if ($('#stateTimeline').children.length !== 0) {
            $('#stateTimeline').html('');
        }
        //horizon chart
        div.selectAll('.horizon')
                .data([states])
            .enter().append('div')
                .attr('class', 'horizon')
                .call(context.horizon()
                    .height(60)
                    .extent(function() {
                        return [0,60].map(function(d) {return d*step/1000/60/5;});
                    })
                    // .colors([0].concat(colorbrewer.Purples[3]))
                    // .colors([0].concat(["#fee6ce","#fdae6b","#e6550d"]))
                    // .colors(["#e66101","#fdb863","#b2abd2","#5e3c99"])
                    .colors(['#e66101','#e66101','#e66101','#F2E97A','#F1B668','#732F11'])
                    .title(function() {
                        if (state === 'all'){
                            return 'USA';
                        } else{
                            return state;
                        }
                    })
                );
    });
}

socket.on('history', function(data){
    console.log('history:',data);
    for (var i = 0; i < data.length; i++) {
        tweetDensity[stateArray[i]] = data[i];
    }

    $('#help').removeClass('hidden');
    if (window.innerWidth > 768) {
        startGraph('all', '#mainTimeline');
    }
});

socket.on('history2', function(data){
    console.log(data);
    for (var stateTD in tweetDensity) {
        //use last four numbers for the average
        var numTimeToAverage = 4;
        tweetAverages[stateTD] = tweetDensity[stateTD].slice(-1 * numTimeToAverage).reduce(function(a,b){
            return a + b;
        },0)/numTimeToAverage; //tweetDensity[stateTD].length;
    }
    console.log('history2: ',data);
    console.log('history2: ',tweetAverages);

    //update choropleth
    color.domain(colorRange);

    states.selectAll('path')
        .transition()
          .duration(500)
          .style('fill', function(d) {
                var state = d.properties.code;
                var percentDiff;
                if (tweetAverages[state] !== 0) {
                    percentDiff = (data[stateArray.indexOf(state)] - tweetAverages[state])/tweetAverages[state];
                    // console.log(state,data[stateArray.indexOf(state)],tweetAverages[state]);
                    if (percentDiff > colorMax) {
                        percentDiff = colorMax;
                    } else if (percentDiff < -1 * colorMax) {
                        percentDiff = -1 * colorMax;
                    }
                } else {
                    percentDiff = 0;
                }
                // console.log(percentDiff);
                return color(percentDiff);
            });

    setInterval(function() {
        stateArray.forEach(function(state){
            tweetDensity[state].push(0);
        });
    }, 900000);
});

function onButtonClick() {
    if (tweetQueue.length <= 1) {
        isTweetDisplayed = false;
        $('#tweet').addClass('hidden');
        $('.tweet-box').removeClass('hidden');
        $('.buttons').children().addClass('disabled');
    }
    if (tweetQueue.length > 0) {
        tweet = tweetQueue.shift();
    }
    displayTweet(tweet);
}

$('#sick').click(function() {
    if (tweet) {
        tweet.text = tweet.text.replace(/(@[^ ]+ )|(@[^ ]+)/g,'').trim();
        socket.emit('classifyTweet', 'sick', tweet);
        onButtonClick();
    }
});

$('#notsick').click(function() {
    if (tweet) {
        tweet.text = tweet.text.replace(/(@[^ ]+ )|(@[^ ]+)/g,'').trim();
        socket.emit('classifyTweet', 'not', tweet);
        onButtonClick();
    }
});

$('#skip').click(function() {
    if (tweet) {
        tweet.text = tweet.text.replace(/(@[^ ]+ )|(@[^ ]+)/g,'').trim();
        socket.emit('classifyTweet', 'dono', tweet);
        onButtonClick();
    }
});

$('#getTweets').click(function() {
    socket.emit('getTweets');
});

var intro = introJs();
var introSteps = [
    {
        element: '.title',
        intro: "TwitterHealth attempts to display where people are tweeting about illness and sickness.<br>It uses a machine learning algorithm to filter out tweets that contain sickness related keywords that are used in the wrong context. In addition, it allows the user to contribute to the machine learning classification and help generate classified tweet data.<br><a href=\"https://github.com/eltacodeldiablo/twitterhealth\">Check the source!</a>",
    },
    {
        element: '#chart',
        intro: "The map displays the number of 'sick' tweets normalized by the average number of 'sick' tweets by state. The last 100 'sick' cities that have been received are displayed as points on the map. Click on an individual state to get look at time series and related data.",
    },
    {
        element: '#tweetClassifer',
        intro: "Please help train our machine learning algorithm/contribute to open classified tweet data!<br>Click the buttons 'sick', 'not' or 'skip' depending on if the tweet is actually talking about feeling ill/sick, not talking about feeling ill/sick or you can't tell. Keyboard shortcuts to click 'sick', 'not', and 'skip' are 'z', 'x', and 'c' respectively.",
        position: 'top'
    }
    ];
if (window.innerWidth >= 768) {
    introSteps.push(
    {
        element: '#mainTimeline',
        intro: "This chart shows the number of tweets per 15 minute interval in the entire united states over the last week.",
        position: 'top'
    });
    $('#sick').text('Sick [z]');
    $('#notsick').text('Not [x]');
    $('#skip').text('Skip [c]');
    $('#help').text('Help [h]');
}
intro.setOptions({
    steps: introSteps
});
$('#help').click(function() {
    intro.start();
});

$(document).on('keydown', function(event) {
    if (event.which === 90) { //z
        event.preventDefault();
        $('#sick').click();
    } else if (event.which === 88) { //x
        event.preventDefault();
        $('#notsick').click();
    } else if (event.which === 67) { //c
        event.preventDefault();
        $('#skip').click();
    } else if (event.which === 72) { //h
        event.preventDefault();
        $('#help').click();
    }
});
