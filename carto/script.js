
const {DeckGL, HexagonLayer} = deck;

const layer = new HexagonLayer({
  id: 'HexagonLayer',
  data: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf-bike-parking.json',
  
  /* props from HexagonLayer class */
  
  // colorAggregation: 'SUM',
  // colorDomain: null,
  // colorRange: [[255, 255, 178], [254, 217, 118], [254, 178, 76], [253, 141, 60], [240, 59, 32], [189, 0, 38]],
  // colorScaleType: 'quantize',
  // coverage: 1,
  // elevationAggregation: 'SUM',
  // elevationDomain: null,
  // elevationLowerPercentile: 0,
  // elevationRange: [0, 1000],
  elevationScale: 4,
  // elevationScaleType: 'linear',
  // elevationUpperPercentile: 100,
  extruded: true,
  // getColorValue: null,
  // getColorWeight: 1,
  // getElevationValue: null,
  // getElevationWeight: 1,
  getPosition: d => d.COORDINATES,
  // hexagonAggregator: null,
  // lowerPercentile: 0,
  // material: true,
  // onSetColorDomain: null,
  // onSetElevationDomain: null,
  radius: 100,
  // upperPercentile: 100,
  
  /* props inherited from Layer class */
  
  // autoHighlight: false,
  // coordinateOrigin: [0, 0, 0],
  // coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
  // highlightColor: [0, 0, 128, 128],
  // modelMatrix: null,
  // opacity: 1,
  pickable: true,
  // visible: true,
  // wrapLongitude: false,
});

new DeckGL({
  mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  initialViewState: {
    longitude: 37.618423,
    latitude: 55.751244,
    zoom: 12,
    maxZoom: 20,
    pitch: 30,
    bearing: 0
  },
  controller: true,
  getTooltip: ({object}) => object && `${object.position.join(', ')}
Count: ${object.points.length}`,
  layers: [layer]
});
  