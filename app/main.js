/* global io */
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

var area = {'AL':4822.023,'AK':731.449,'AZ':6553.255,'AR':2949.131,'CA':38041.430,'CO':5187.582,'CT':3590.347,'DE':917.092,'DC':632.323,'FL':19317.568,'GA':9919.945,'HI':1392.313,'ID':1595.728,'IL':12875.255,'IN':6537.334,'IA':3074.186,'KS':2885.905,'KY':4380.415,'LA':4601.893,'ME':1329.192,'MD':5884.563,'MA':6646.144,'MI':9883.360,'MN':5379.139,'MS':2984.926,'MO':6021.988,'MT':1005.141,'NE':1855.525,'NV':2758.931,'NH':1320.718,'NJ':8864.590,'NM':2085.538,'NY':19570.261,'NC':9752.073,'ND':699.628,'OH':11544.225,'OK':3814.820,'OR':3899.353,'PA':12763.536,'PR':3667.084,'RI':1050.292,'SC':4723.723,'SD':833.354,'TN':6456.243,'TX':26059.203,'UT':2855.287,'VT':626.011,'VA':8185.867,'WA':6897.012,'WV':1855.413,'WI':5726.398,'WY':576.412};
var pop = {'ND': 723393.0, 'NE': 1868516.0, 'NC': 9848060.0, 'HI': 1404054.0, 'PR': 0, 'NM': 2085287.0, 'NJ': 8899339.0, 'NH': 1323459.0, 'NV': 2790136.0, 'AZ': 6626624.0, 'PA': 12773801.0, 'TN': 6495978.0, 'NY': 19651127.0, 'GA': 9992167.0, 'CT': 3596080.0, 'AL': 4833722.0, 'MT': 1015165.0, 'MS': 2991207.0, 'WV': 1854304.0, 'MO': 6044171.0, 'MN': 5420380.0, 'OK': 3850568.0, 'CA': 38332521.0, 'OR': 3930065.0, 'MI': 9895622.0, 'AR': 2959373.0, 'CO': 5268367.0, 'MD': 5928814.0, 'VT': 626630.0, 'MA': 6692824.0, 'AK': 735132.0, 'IA': 3090416.0, 'UT': 2900872.0, 'ID': 1612136.0, 'WY': 582658.0, 'TX': 26448193.0, 'IN': 6570902.0, 'IL': 12882135.0, 'WA': 6971406.0, 'KY': 4395295.0, 'RI': 1051511.0, 'WI': 5742713.0, 'ME': 1328302.0, 'KS': 2893957.0, 'DE': 925749.0, 'FL': 19552860.0, 'SC': 4774839.0, 'DC': 646449.0, 'OH': 11570808.0, 'SD': 844877.0, 'VA': 8260405.0, 'LA': 4625470.0};

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
    .range(["#f1a340","#f7f7f7","#998ec3"]);

var isTweetDisplayed = false;
var tweet;
var tweetQueue = [];
var colorMax = 3;
var colorRange = [-1 * colorMax, 0, colorMax];

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

d3.json('us-named.json', function(error, us) {
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

function resetMap() {
    //reset
    tweetLocations = [];
    updatePoints([]);
    d3.timer.flush();
    tweetDensity = getResetStates();
    color.domain(colorRange);
    states.selectAll('path')
        .transition()
        .duration(500)
        .style('fill', color(0));
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
          .style('fill', function(d, i) {
                var state = d.properties.code;
                if (tweetAverages[state] !== 0) {
                    var percentDiff = (tweets15min[stateArray.indexOf(state)] - tweetAverages[state])/tweetAverages[state];
                    if (percentDiff > colorMax) {
                        percentDiff = colorMax;
                    } else if (percentDiff < -1 * colorMax) {
                        percentDiff = -1 * colorMax;
                    }
                    // console.log(state,data[stateArray.indexOf(state)],tweetAverages[state]);
                } else {
                    var percentDiff = 0;
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
var tweets15min = {};
var mainTimeline;
var total = [];

//tweet timeline
//create metric
var step;
var graphSize;
var context;

function makeWithConcat(len) {
    var a, rem, currlen;
    if (len === 0) {
        return [];
    }
    a = [0];
    currlen = 1;
    while (currlen < len) {
        rem = len - currlen;
        if (rem < currlen) {
            a = a.concat(a.slice(0, rem));
        }
        else {
            a = a.concat(a);
        }
        currlen = a.length;
    }
    return a;
}

function command(state) {
    var firstTime = true,
    values = [];
    // last;
    return context.metric(function(start, stop, step, callback) {
        var data;
        if (state === 'all') {
            var total = [];
            var numHistory = tweetDensity[stateArray[0]].length;
            for (var i = 0; i < numHistory; i++) {
                var tempTotal = 0;
                for (state in tweetDensity) {
                    tempTotal += tweetDensity[state][i];
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
                    .colors(["#e66101","#fdb863","#b2abd2","#5e3c99"])
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

    $('#instructions').removeClass('hidden');
    if (window.innerWidth > 768) {
        startGraph('all', '#mainTimeline');
    }
});

socket.on('history2', function(data){
    console.log(data);
    for (state in tweetDensity) {
        //use last four numbers for the average
        numTimeToAverage = 4;
        tweetAverages[state] = tweetDensity[state].slice(-1 * numTimeToAverage).reduce(function(a,b){
            return a + b;
        },0)/numTimeToAverage; //tweetDensity[state].length;
    }
    console.log('history2: ',data);
    console.log('history2: ',tweetAverages);

    //update choropleth
    color.domain(colorRange);

    states.selectAll('path')
        .transition()
          .duration(500)
          .style('fill', function(d, i) {
                var state = d.properties.code;
                if (tweetAverages[state] !== 0) {
                    var percentDiff = (data[stateArray.indexOf(state)] - tweetAverages[state])/tweetAverages[state];
                    // console.log(state,data[stateArray.indexOf(state)],tweetAverages[state]);
                    if (percentDiff > colorMax) {
                        percentDiff = colorMax;
                    } else if (percentDiff < -1 * colorMax) {
                        percentDiff = -1 * colorMax;
                    }
                } else {
                    var percentDiff = 0;
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
    tweet.text = tweet.text.replace(/(@[^ ]+ )|(@[^ ]+)/g,'').trim();
    socket.emit('classifyTweet', 'sick', tweet);
    onButtonClick();
});

$('#notsick').click(function() {
    tweet.text = tweet.text.replace(/(@[^ ]+ )|(@[^ ]+)/g,'').trim();
    socket.emit('classifyTweet', 'not', tweet);
    onButtonClick();
});

$('#skip').click(function() {
    tweet.text = tweet.text.replace(/(@[^ ]+ )|(@[^ ]+)/g,'').trim();
    socket.emit('classifyTweet', 'dono', tweet);
    onButtonClick();
});

$('#getTweets').click(function() {
    socket.emit('getTweets');
});

var intro = introJs();
introSteps = [
    {
        element: '.title',
        intro: "TwitterHealth attempts to display where people are tweeting about illness and sickness.\nIt uses a machine learning algorithm to filter out tweets that contain sickness related keywords that are used in the wrong context. In addition, it allows the user to contribute to the machine learning classification and help generate classified tweet data."
    },
    {
        element: '#chart',
        intro: "The map displays the number of 'sick' tweets normalized by the average number of 'sick' tweets by state (yellow is below average and purple is above average). The last 100 'sick' tweets that have been received  are displayed as points on the map. Click on an individual state to get look at time series and related data.",
    },
    {
        element: '#tweetClassifer',
        intro: "Please help train our machine learning algorithm/contribute to open source classified tweet data!\nClick the buttons 'sick', 'not' or 'skip' depending on if the tweet is actually talking about feeling ill/sick, not talking about feeling ill/sick or you can't tell. Keyboard shortcuts to click 'sick', 'not', and 'skip' are 'z', 'x', and 'c' respectively.",
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
}
intro.setOptions({
    steps: introSteps
});
$('#instructions').click(function() {
    intro.start();
});

$(document).on('keydown', function(event) {
    if (event.which === 90) {
        event.preventDefault();
        $('#sick').click();
    } else if (event.which === 88) {
        event.preventDefault();
        $('#notsick').click();
    } else if (event.which === 67) {
        event.preventDefault();
        $('#skip').click();
    }
});
