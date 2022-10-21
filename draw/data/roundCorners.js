export function roundCorners(line, maxOffset) {
  if (line.geometry.coordinates.length == 2) {
    return line;
  } else {
    var lineSplitCoef = 2.2;
    var arcQuality = 2; //lower - better
    var arx = [];
    var segments = turf.lineSegment(line);
    for (var i = 0; i < segments.features.length - 1; i++) {
      var currOffset;
      var lengths = [
        turf.length(segments.features[i], { units: "meters" }),
        turf.length(segments.features[i + 1], { units: "meters" })
      ];
      var min = Math.min(...lengths);

      var bearings = [
        turf.bearing(
          segments.features[i].geometry.coordinates[0],
          segments.features[i].geometry.coordinates[1]
        ),
        turf.bearing(
          segments.features[i + 1].geometry.coordinates[0],
          segments.features[i + 1].geometry.coordinates[1]
        )
      ];
      var phi =
        Math.abs(
          turf.bearingToAngle(bearings[1]) - turf.bearingToAngle(bearings[0])
        ) % 360; // This is either the distance or 360 - distance
      var a = phi > 180 ? 360 - phi : phi;
      var angle = 180 - a;
      var rad = (angle * Math.PI) / 360;
      var tan = Math.tan(rad);
      var catetLength = (min / lineSplitCoef) * tan;
      if (maxOffset > catetLength) {
        currOffset = (min / lineSplitCoef) * tan;
      } else {
        currOffset = maxOffset;
      }

      var translated1left = turf.transformTranslate(
        segments.features[i],
        currOffset,
        bearings[0] + 90,
        { units: "meters" }
      );
      var translated1right = turf.transformTranslate(
        segments.features[i],
        currOffset,
        bearings[0] - 90,
        { units: "meters" }
      );
      var translated2left = turf.transformTranslate(
        segments.features[i + 1],
        currOffset,
        bearings[1] + 90,
        { units: "meters" }
      );
      var translated2right = turf.transformTranslate(
        segments.features[i + 1],
        currOffset,
        bearings[1] - 90,
        { units: "meters" }
      );
      var arc;
      var intersects1 = turf.lineIntersect(translated1left, translated2left);
      var intersects2 = turf.lineIntersect(translated1right, translated2right);
      var steps = parseInt(currOffset / arcQuality) * 2 + 4;
      if (steps > 64) {
        steps = 64;
      }
      if (intersects1.features.length > 0) {
        var centre = intersects1.features[0].geometry.coordinates;
        arc = turf.lineArc(
          centre,
          currOffset,
          bearings[0] - 90,
          bearings[1] - 90,
          {
            units: "meters",
            steps: steps //steps
          }
        );
      }
      if (intersects2.features.length > 0) {
        var centre = intersects2.features[0].geometry.coordinates;
        arc = turf.rewind(
          turf.lineArc(
            centre,
            currOffset,
            bearings[1] + 90,
            bearings[0] + 90,

            {
              units: "meters",
              steps: steps //steps
            }
          )
        );
      }
      arx.push(arc);
    }

    var parts = [];
    var firstCoord = line.geometry.coordinates[0];
    arx.forEach((arc) => {
      var pt = turf.point(firstCoord);
      var fin = turf.nearestPointOnLine(arc, pt, { units: "meters" }).geometry
        .coordinates;
      var part = turf.lineString([firstCoord, fin]);
      if (fin == arc.geometry.coordinates[0]) {
        firstCoord =
          arc.geometry.coordinates[arc.geometry.coordinates.length - 1];
      }
      if (
        fin == arc.geometry.coordinates[arc.geometry.coordinates.length - 1]
      ) {
        firstCoord = arc.geometry.coordinates[0];
        arc.geometry.coordinates = arc.geometry.coordinates.slice().reverse();
      }
      parts.push(part);
      parts.push(arc);
    });
    var lastPart = turf.lineString([
      firstCoord,
      line.geometry.coordinates[line.geometry.coordinates.length - 1]
    ]);
    parts.push(lastPart);
    var id;
    if (line.id) {
      id = line.id;
    } else {
      id = line.properties.id;
    }
    var finFeature = {
      type: "Feature",
      properties: {
        id: id
      },
      geometry: {
        type: "LineString",
        coordinates: []
      }
    };
    parts.forEach((part) => {
      part.geometry.coordinates.forEach((coord) => {
        finFeature.geometry.coordinates.push(coord);
      });
    });

    function uniq(a) {
      var seen = {};
      var out = [];
      var len = a.length;
      var j = 0;
      for (var i = 0; i < len; i++) {
        var item = a[i];
        if (seen[item] !== 1) {
          seen[item] = 1;
          out[j++] = item;
        }
      }
      return out;
    }
    finFeature.geometry.coordinates = uniq(finFeature.geometry.coordinates);
    return finFeature;
  }
}
