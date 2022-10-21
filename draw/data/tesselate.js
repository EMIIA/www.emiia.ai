export function createExtrusion(feature) {
  if (feature.geometry.type === "Polygon") {
    var line = turf.polygonToLine(feature);
    var chunk = turf.lineChunk(line, 15, { units: "meters" });
    var points = turf.explode(chunk);
    var tin = turf.tin(points);
    var lengths = [];

    tin.features.forEach((triangle) => {
      var intersection = turf.intersect(feature, triangle);
      if (intersection) {
        var exploded = turf.explode(intersection);
        var currLengths = [
          turf.distance(exploded.features[0], exploded.features[1], {
            units: "meters"
          }),
          turf.distance(exploded.features[1], exploded.features[2], {
            units: "meters"
          }),
          turf.distance(exploded.features[2], exploded.features[3], {
            units: "meters"
          })
        ];
        var max = Math.max.apply(Math, currLengths);
        lengths.push(max);
      }
    });
    var maxLength = Math.max.apply(Math, lengths);
    var area = turf.area(feature);
    feature.properties.height =
      maxLength > 70
        ? 18
        : maxLength > 25 && maxLength < 40 && area < 800
        ? 63
        : 30;
    /*feature.properties.height =
      maxLength > 70
        ? 15
        : maxLength > 25 && maxLength < 40 && area < 800
        ? 60
        : 30;*/
    return feature;
  }
}
