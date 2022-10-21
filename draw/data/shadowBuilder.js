export function makeShadow(feature) {
  var segments = turf.lineSegment(feature);
  var shadowParts = {
    type: "FeatureCollection",
    features: []
  };
  var displace = 15;
  if (feature.properties.height) {
    if (feature.properties.height > 0) {
      displace = feature.properties.height;
    } else {
      return;
    }
  }
  segments.features.forEach((segment) => {
    var translated = turf.transformTranslate(segment, displace, 135, {
      units: "meters"
    });
    var coords = [
      segment.geometry.coordinates[1],
      segment.geometry.coordinates[0],
      translated.geometry.coordinates[0],
      translated.geometry.coordinates[1],
      segment.geometry.coordinates[1]
    ];
    var shadowPart = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [coords] }
    };
    shadowParts.features.push(shadowPart);
  });
  var poly1 = shadowParts.features[0];
  for (var i = 1; i < shadowParts.features.length; i++) {
    var poly2 = turf.union(poly1, shadowParts.features[i]);
    poly1 = poly2;
  }
  var result = turf.difference(poly1, feature);
  if (feature.id) {
    result.properties.id = feature.id;
  } else {
    result.properties.id = feature.properties.id;
  }
  return result;
}
