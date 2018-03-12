var poolWorkerData;
var poolHashrateData;
var poolBlockData;

var poolWorkerChart;
var poolHashrateChart;
var poolBlockChart;

var statData;
var poolKeys;

function buildChartData(){

    var pools = {};

    poolKeys = [];
    for (var i = 0; i < statData.length; i++){
        for (var pool in statData[i].pools){
            if (poolKeys.indexOf(pool) === -1)
                poolKeys.push(pool);
        }
    }


    for (var i = 0; i < statData.length; i++){
        var time = statData[i].time * 1000;
        for (var f = 0; f < poolKeys.length; f++){
            var pName = poolKeys[f];
            var a = pools[pName] = (pools[pName] || {
                hashrate: [],
                workers: [],
                blocks: []
            });
            if (pName in statData[i].pools){
                a.hashrate.push([time, statData[i].pools[pName].hashrate]);
                a.workers.push([time, statData[i].pools[pName].workerCount]);
                a.blocks.push([time, statData[i].pools[pName].blocks.pending])
            }
            else{
                a.hashrate.push([time, 0]);
                a.workers.push([time, 0]);
                a.blocks.push([time, 0])
            }
        }
    }

    poolWorkerData = [];
    poolHashrateData = [];
    poolBlockData = [];

    for (var pool in pools){
        poolWorkerData.push({
            label: pool,
            value: pools[pool].workers[pools[pool].workers.length - 1][1]
        });
    	var hashes = [];
    	for(hashstamp in pools[pool].hashrate) {
        	var hash = hashstamp[1];
        	if(!isNaN(hash)){
        		hashes.push(hashstamp[1]);
        	}
        }
    	var sum = hashes.reduce(function(a, b){ return parseFloat(a) + parseFloat(b); });
    	var avg = sum / hashes.length;
        poolHashrateData.push({
            label: pool,
            value: avg
        });
        poolBlockData.push({
            key: pool,
            values: pools[pool].blocks
        })
    }
}

function getReadableHashRateString(hashrate){
    var i = -1;
    var byteUnits = [ ' KH', ' MH', ' GH', ' TH', ' PH' ];
    do {
        hashrate = hashrate / 1024;
        i++;
    } while (hashrate > 1024);
    return Math.round(hashrate) + byteUnits[i];
}

function timeOfDayFormat(timestamp){
    var dStr = d3.time.format('%I:%M %p')(new Date(timestamp));
    if (dStr.indexOf('0') === 0) dStr = dStr.slice(1);
    return dStr;
}

function displayCharts(){
  var chartColors = [
      pattern.draw('square', '#ff6384'),
      pattern.draw('circle', '#36a2eb'),
      pattern.draw('diamond', '#cc65fe'),
      pattern.draw('triangle', '#ffce56'),
      pattern.draw('dots', '#dd245d'),
  ];
	var workerPieChart = new Chart($("#workerChart"),{
    	type: 'pie',
    	data: {
        	labels: poolWorkerData.slice(0, Math.max(5, poolWorkerData.length)).map(x => x.label),
        	datasets: [{
            	data: poolWorkerData.slice(0, Math.max(5, poolWorkerData.length)).map(x => x.value),
              backgroundColor: chartColors
          }],
      },
    	options: {}
	});

	var workerPieChart = new Chart($("#hashChart"),{
    	type: 'pie',
    	data: {
        	labels: poolHashrateData.slice(0, Math.max(5, poolHashrateData.length)).map(x => x.label),
        	datasets: [{
            	data: poolHashrateData.slice(0, Math.max(5, poolHashrateData.length)).map(x => x.value),
              backgroundColor: chartColors
            }]
        },
    	options: {}
	});


    nv.addGraph(function() {
        poolBlockChart = nv.models.multiBarChart()
            .x(function(d){ return d[0] })
            .y(function(d){ return d[1] });

        poolBlockChart.xAxis.tickFormat(timeOfDayFormat);

        poolBlockChart.yAxis.tickFormat(d3.format('d'));

        d3.select('#poolBlocks').datum(poolBlockData).call(poolBlockChart);

        return poolBlockChart;
    });
}

function pastelColors(){
    var r = (Math.round(Math.random()* 127) + 127).toString(16);
    var g = (Math.round(Math.random()* 127) + 127).toString(16);
    var b = (Math.round(Math.random()* 127) + 127).toString(16);
    return '#' + r + g + b;
}

function TriggerChartUpdates(){
    poolWorkerChart.update();
    poolHashrateChart.update();
    poolBlockChart.update();
}

nv.utils.windowResize(TriggerChartUpdates);

$.getJSON('/api/pool_stats', function(data){
    statData = data;
    buildChartData();
    displayCharts();
});

statsSource.addEventListener('message', function(e){
    var stats = JSON.parse(e.data);
    statData.push(stats);

    var newPoolAdded = (function(){
        for (var p in stats.pools){
            if (poolKeys.indexOf(p) === -1)
                return true;
        }
        return false;
    })();

    if (newPoolAdded || Object.keys(stats.pools).length > poolKeys.length){
        buildChartData();
        displayCharts();
    }
    else {
        var time = stats.time * 1000;
        for (var f = 0; f < poolKeys.length; f++) {
            var pool =  poolKeys[f];
            for (var i = 0; i < poolWorkerData.length; i++) {
                if (poolWorkerData[i].key === pool) {
                    poolWorkerData[i].values.shift();
                    poolWorkerData[i].values.push([time, pool in stats.pools ? stats.pools[pool].workerCount : 0]);
                    break;
                }
            }
            for (var i = 0; i < poolHashrateData.length; i++) {
                if (poolHashrateData[i].key === pool) {
                    poolHashrateData[i].values.shift();
                    poolHashrateData[i].values.push([time, pool in stats.pools ? stats.pools[pool].hashrate : 0]);
                    break;
                }
            }
            for (var i = 0; i < poolBlockData.length; i++) {
                if (poolBlockData[i].key === pool) {
                    poolBlockData[i].values.shift();
                    poolBlockData[i].values.push([time, pool in stats.pools ? stats.pools[pool].blocks.pending : 0]);
                    break;
                }
            }
        }
        TriggerChartUpdates();
    }


});
