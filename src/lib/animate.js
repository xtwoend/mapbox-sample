animationSettings = {
    "timestamp_start": 1409554742,
    "timestamp_end": 1409618978,
    "timestamp_now": 1409618978,
    "seconds_per_frame": 15,
    "animating": true,
    "ship_data": []
};

function setupAnimations(data) {
    // Pre-process the data:
    // 1. Calculate min/max timestamp to set animation range
    // 2. Tag each feature with ship size & color based on handmade filters
    data.features.forEach(function(feature) {
        animationSettings.timestamp_start = Math.min(animationSettings.timestamp_start, feature.properties.startTime)
        animationSettings.timestamp_end = Math.max(animationSettings.timestamp_end, feature.properties.endTime)

        shipType = "none";
        for (t in shipFilters) {
            if(shipFilters[t].indexOf(feature.properties.MMSI) >= 0) {
                shipType = t;
                break;
            }
        }
        
        feature.properties.type = shipType;
        if(shipType == "Oil Tankers" || shipType == "Container Ships" || shipType == "Cruise Ships") {
            feature.properties.scale = 10;
            feature.properties.shipIconType = "large";
        }
        else if(shipType == "Ferries" || shipType == "Tugs" || shipType == "Pilot Boats") {
            feature.properties.scale = 5;
            feature.properties.shipIconType = "medium";
        }
        else {
            feature.properties.scale = 1;
            feature.properties.shipIconType = "small";
        }
    });

    console.log(data);

    animationSettings.timestamp_now = animationSettings.timestamp_start; // Start at the start

    // Save this dataset for future animation frames
    animationSettings.ship_data = data;


    // Build a set of initial points from the data
    map.addSource('ship-points', {
        "type": "geojson",
        "data": generateCurrentShipGeojson(data)
    });

    map.addLayer({
        "id": "ship-positions",
        "type": "symbol",
        "source": "ship-points",
        "layout": {
            "icon-image": "ship-{shipIconType}",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-size": {
                stops: [
                    [8, 0.12],
                    [13, 0.45],
                    [17, 0.9]
                ]
            },
            "icon-rotate": {
                property: "heading",
                stops: [
                    [-360, -360],
                    [0, 0],
                    [360,360]
                ]
            },
            "icon-rotation-alignment": "map"
        }
    });
    
    animate();
}

function generateCurrentShipGeojson(data, settings) {
    if(typeof(settings) === 'undefined') settings = animationSettings;
    out = {
        "type": "FeatureCollection",
        "features": []
    }

    data.features.forEach(function(feature) {
        // TODO: Calculate index based on animation settings and progress
        progress = (settings.timestamp_now - feature.properties.startTime) / (feature.properties.endTime-feature.properties.startTime);
        if(progress < 0) progress = 0;
        if(progress > 1) progress = 1;
        idx = progress * feature.geometry.coordinates.length-1;
        point_a = feature.geometry.coordinates[Math.floor(idx)];
        point_b = feature.geometry.coordinates[Math.ceil(idx)];
        interpolate = idx - Math.floor(idx);

        coord = [0,0];

        if(typeof(point_a) !== 'undefined' && typeof(point_b) !== 'undefined') {
            coord = [
                (point_b[0] - point_a[0]) * interpolate + point_a[0],
                (point_b[1] - point_a[1]) * interpolate + point_a[1]
            ];

            if(feature.properties.heading == null) feature.properties.heading = 0;
            // Calculate current heading and ease towards it
            if(idx > 0);
            var dP = [point_b[0] - point_a[0], point_b[1] - point_a[1]];
            var mag = dP[0] * dP[0] + dP[1] * dP[1];
            if(mag > 0.00000005) { // Don't update heading for ships that aren't moving; it's distracting
                var targetHeading = -Math.atan2(dP[1], dP[0]) * 180 / Math.PI + 90;
                var dH = targetHeading - feature.properties.heading;
                if(dH > 180) dH -= 360; // Prevent spinouts
                if(dH < -180) dH += 360;
                feature.properties.heading += (dH) * 0.5;

                if(feature.properties.heading > 360) feature.properties.heading -= 360;
                if(feature.properties.heading < -360) feature.properties.heading += 360;
            }
        }

        out.features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coord,
            },
            "properties": {
                "scale": feature.properties.scale,
                "shipIconType": feature.properties.shipIconType,
                "type": feature.properties.type,
                "heading": feature.properties.heading
            }
        })

    })

    return out;

}

function requestAnimation(e) {
    if(e.dataType == "source") {
        map.getSource("ship-points").off("data", requestAnimation);
        window.requestAnimationFrame(animate);
    }
}

function animate() {
    if(animationSettings.animating) {
        setTime(animationSettings.timestamp_now + animationSettings.seconds_per_frame);
    }
    
    map.getSource("ship-points").on("data", requestAnimation);

    // Get current ship positions and cull out those that are not on screen
    var currentShips = generateCurrentShipGeojson(animationSettings.ship_data);
    var visibleFeatures = [];
    currentShips.features.forEach(function(feat) {
        var p = map.project(feat.geometry.coordinates);
        if(p.x >= 0 && p.x <= map.transform.width && p.y >= 0 && p.y <= map.transform.height)
            visibleFeatures.push(feat);
    });
    currentShips.features = visibleFeatures;
    map.getSource("ship-points").setData(currentShips);
}

function setTime(timestamp) {
    animationSettings.timestamp_now = timestamp;
    // Loop
    if(animationSettings.timestamp_now > animationSettings.timestamp_end) {
        animationSettings.timestamp_now = animationSettings.timestamp_start;
        console.log("looping animation");
    }

    setClockTime(animationSettings.timestamp_now);
}

function setClockTime(timestamp) {
    var date = new Date(timestamp * 1000);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    var minuteAngle = (minutes + seconds/60) / 60 * 360;
    var hourAngle = (hours + ((minutes + seconds/60) / 60)) / 24 * 360
    $("#clockMinuteHand").attr("transform", "rotate(" + minuteAngle + ")");
    $("#clockHourHand").attr("transform", "rotate(" + hourAngle + ")");
}

function setupClock() {
    $("#clock").svg({onLoad: function(svg) {
        console.log(svg);
        var width = $("#clock").width();
        var height = $("#clock").height();
        var clock = svg.group({
            transform: "translate(" + (width/2) + "," + (height/2) + ")"
        });
        var face = svg.group(clock, {
            fill: 'none',
            stroke: 'white',
            strokeWidth: 1
        });
        svg.circle(face, 0,0, width * 0.4);
        for(var i=0; i<24; i++) {
            var angle = i / 24 * Math.PI * 2;
            svg.line(face, Math.cos(angle) * width * 0.37, Math.sin(angle) * width * 0.37,
                           Math.cos(angle) * width * 0.35, Math.sin(angle) * width * 0.35);
        }

        var hourHand = svg.line(clock, 0,0, 0, -width * 0.2, {
            stroke: 'white',
            strokeWidth: 4,
            strokeLineCap: 'round'
        });

        var minuteHand = svg.line(clock, 0,0, 0, -width * 0.3, {
            stroke: 'white',
            strokeWidth: 2.5,
            strokeLineCap: 'round',
            transform: 'rotate(45)'
        });

        $(hourHand).attr("id", "clockHourHand");
        $(minuteHand).attr("id", "clockMinuteHand");
    }});

    $("#clock svg").mousedown(function(ev) {
        console.log(animationSettings.timestamp_now);
        $(this).data("dragging", true);

        animationSettings.animating = !animationSettings.animating;
    }).mousemove(function(ev) {
        if($(this).data("dragging")) {
            var relX = ev.pageX - $(this).offset().left - $(this).width() / 2;
            var relY = ev.pageY - $(this).offset().top - $(this).height() / 2;
            var angle = Math.atan2(relY, relX) * 180 / Math.PI + 90;
            if(angle < 0) angle += 360;
            // Set time
            setTime(animationSettings.timestamp_start + (angle / 360 * 24 * 60 * 60));

            animationSettings.animating = false;
        }
    }).mouseup(function(ev) {
        $(this).data("dragging", false);
        //animationSettings.animating = true;
    });
}