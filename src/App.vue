<template>
  <MapboxMap
    @mb-created="(mapboxInstance) => map = mapboxInstance"
    @mb-load="loaded"
    style="height: 800px; width: 1208px;"
    access-token="pk.eyJ1Ijoia3JvbmljayIsImEiOiJjaWxyZGZwcHQwOHRidWxrbnd0OTB0cDBzIn0.u2R3NY5PnevWH3cHRk6TWQ"
    map-style="mapbox://styles/mapbox/satellite-streets-v12"
    :center="[105.987732, -5.898973]"
    :zoom="9"
    >
    <MapboxNavigationControl position="bottom-right" />
  </MapboxMap>
</template>

<script>
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxMap, MapboxNavigationControl } from '@studiometa/vue-mapbox-gl';
import coordinates from './lib/widuri.json';
import shipIcon from './assets/ship.png'

export default {
  components: {MapboxMap, MapboxNavigationControl},
  data() {
    return {
      map: null,
      current: []
    }
  },
  mounted() {
    // 
  },
  methods: {
    async loaded() {

      // create track
      let routes = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
      
      coordinates.forEach((row, i) => {
        if(this.current){
          let r = this.calcCrow(this.current[1], this.current[0], row.lat, row.lng);
          if(r > 200) {
            return;
          }
        }
        routes.geometry.coordinates.push([row.lng, row.lat])
        this.current = [row.lng, row.lat]
      })

      this.map.addSource('route', {
        type: 'geojson',
        data: routes
      })

      this.map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#40f793',
          'line-width': 2
        }
      });
      let lastPosition = coordinates[coordinates.length - 1]
      this.positionShip(lastPosition)
    },
    positionShip(row) {
      this.map.loadImage(shipIcon, (err, img) => {
        if(err) throw err
        this.map.addImage('ship', img);
      })
      
      this.map.addSource('ship-points', {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "geometry": {
                  "type": "Point",
                  "coordinates": [row.lng, row.lat],
              },
              "properties": {
                  "scale": 1,
                  "heading": row.heading
              }
            }
          ]
        }
      });

      this.map.addLayer({
        "id": "ship-positions",
        "type": "symbol",
        "source": "ship-points",
        "layout": {
            "icon-image": "ship",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-size": 0.05,
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
    },
    calcCrow(lat1, lon1, lat2, lon2) 
    {
      var R = 6371; // km
      var dLat = this.toRad(lat2-lat1);
      var dLon = this.toRad(lon2-lon1);
      var lat1 = this.toRad(lat1);
      var lat2 = this.toRad(lat2);

      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      var d = R * c;
      return d;
    },

    // Converts numeric degrees to radians
    toRad(Value) 
    {
        return Value * Math.PI / 180;
    }
  }
}
</script>
<style scoped>

</style>
