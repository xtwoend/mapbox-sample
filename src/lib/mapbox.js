
    var currentTourStop = null;


    mapboxgl.accessToken = 'pk.eyJ1Ijoia3JvbmljayIsImEiOiJjaWxyZGZwcHQwOHRidWxrbnd0OTB0cDBzIn0.u2R3NY5PnevWH3cHRk6TWQ';
    var map = new mapboxgl.Map({
        container: 'map',
        //style: 'mapbox://styles/kronick/ciqtt3fbu000bbmkpfqn8fxyc' // Vector basemap
        style: 'mapbox://styles/kronick/ciqwqz05b0001bmm6evkrxs2k', // Satellite
        // style: 'mapbox://styles/kronick/civu5h7zt001y2kjvqgm8q4us?fresh=true', // Simplified
        center: tourStops[0].cameraOptions.center,
        zoom: tourStops[0].cameraOptions.zoom
    });

    map.on('load', function() {
        if (window.location.search.indexOf('embed') !== -1) map.scrollZoom.disable();
        setupUI();
        showTourStop(tourStops[0]);

        map.setMaxBounds([[-125.09033203124999, 36.53612263184686],[-121.431884765625, 38.95940879245423]]);

        // Set up data-driven styling for different depths
        map.setPaintProperty("Depth Area", "fill-color", {
            property: "DRVAL1",
            stops: [
                [0, "#493854"],
                [17, "#1a0f21"]
            ]
        });

        map.setPaintProperty("Depth Area", "fill-opacity", {
            stops: [
                [9, 0.01],
                [11, 0.25],
                [15, 1.0]
            ]
        })

        // Download ship track data to create animations
        var trace_dataset_id = "civsvwi1605ml2ot87g77ctr4";
        var dataURL = "https://api.mapbox.com/datasets/v1/kronick/" + trace_dataset_id + "/features?access_token=" + mapboxgl.accessToken;
        dataURL = "data/ShipLines.json";
        $.get(dataURL, function(data) {
            setupAnimations(data);
            setupClock();
        });
    });


    map.on('click', function (e) {
        var p = e.point
        var features = map.queryRenderedFeatures([
            {x: p.x-5, y: p.y-5},
            {x: p.x+5, y: p.y+5}
        ]);
        // Find only the ship trace features
        for(var i=0; i<features.length; i++) {
            if(features[i].layer.id == "Ship-Traces") {
                var MMSI = features[i].properties["MMSI"];
                //map.setFilter("Highlighted-Ship-Traces", ["==", "MMSI", MMSI]);
                console.log(MMSI);
                break;
            }
        }
    });

    function setupUI() {
        for(var i=0; i<tourStops.length; i++) {
            var stop = tourStops[i];
            var stopEl = $("<div class='tourStop'></div>");
            stopEl.html("<h2 class='green'>" + stop["title"] + "</h2>");
            stopEl.data("stop", stop);

            if(stop["image"] != null) {
                var imgContainer = $("<div></div>", {
                    class: 'image'
                });
                var imgEl = $("<img></img>", {
                    src: stop["image"]
                });
                imgContainer.append(imgEl);
                if(stop["image-credit"] != null) {
                    imgContainer.append(stop["image-credit"]);
                }
                stopEl.append(imgContainer);
            }

            stopEl.append(stop["description"]);

            if (window.location.search.indexOf('embed') == -1) {
                var nextEl = $("<p><div class='button fill-navy-dark dark'>Next -></div></p>");
                nextEl.on("click", advanceTourStop);
                stopEl.append(nextEl);
            }
            $("#narrative").append(stopEl);
        }

        $("#narrative").on("scroll", function() {
            // Find the tourStop that is closest to the top
            var closestStop = null;
            var closestDistance = Number.MAX_VALUE;
            $("#narrative .tourStop").each(function(idx, el) {
                var dist = Math.abs($(el).offset().top);
                if(dist < closestDistance) {
                    closestStop = $(el).data("stop");
                    closestDistance = dist;
                }
            })
            if(closestStop != null) {
                showTourStop(closestStop);
            }
        });

        $(".button.playback.speed").on("click", function(ev) {
            speed = $(ev.target).data("speed");
            animationSettings.seconds_per_frame = speed;
        });
    }
    