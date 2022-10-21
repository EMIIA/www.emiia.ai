const bridgeMinLength = 15;

function extruder(data, start, height, finish) {
  function uniqAry(a) {
    for (var i = 1; i < a.length; i++) {
      if (JSON.stringify(a[i]) == JSON.stringify(a[i - 1])) {
        a.splice(i, 1);
        i--;
      }
    }
    return a;
    /*return a.sort().filter(function (item, pos, ary) {
      return !pos || JSON.stringify(item) != JSON.stringify(ary[pos - 1]);
    });*/
  }
  //

  const opts = { units: "meters" };

  var coefAngle = 0.06; // 60 промилле = 0.06

  var lengthBridge = turf.length(data, opts);

  var firstSlopeLength = Math.abs(height - start) / coefAngle;
  var secondSlopeLength = Math.abs(height - finish) / coefAngle;

  var finCoords;

  /////////////////////////////////////////////////////////////////
  const flatGap = 10;

  var desiredLength = firstSlopeLength + flatGap + secondSlopeLength;

  if (lengthBridge < desiredLength) {
    if (start / 1 == 0 && finish / 1 == 0) {
      height = ((lengthBridge - 10) / 2) * coefAngle;
      firstSlopeLength = Math.abs(height - start) / coefAngle;
      secondSlopeLength = Math.abs(height - finish) / coefAngle;
      ////
    } else {
      var firstRatio = firstSlopeLength / desiredLength;
      firstSlopeLength = firstRatio * (lengthBridge - flatGap * firstRatio);

      var secondRatio = secondSlopeLength / desiredLength;
      secondSlopeLength = secondRatio * (lengthBridge - flatGap * secondRatio);
    }
  }

  const maxlength = Math.max(...[firstSlopeLength, secondSlopeLength]);

  const step = maxlength / 5; //Math.max(...[maxlength / 5, 10]);

  /////////////////////////////////////////////////////////////////
  var coordsUp = [];
  if (firstSlopeLength > 0) {
    const slopeUp = turf.lineSliceAlong(data, 0, firstSlopeLength, opts);
    var diff1 = height - start;

    var fChunk = turf.lineChunk(slopeUp, step, opts);

    fChunk.features.forEach((chunk) => {
      chunk.geometry.coordinates.forEach((coord) => {
        coordsUp.push(coord);
      });
    });

    coordsUp = uniqAry(coordsUp);

    coordsUp[0][2] = start;
    const slopeUpDistance = turf.length(slopeUp, opts);
    for (var i = 1; i < coordsUp.length - 1; i++) {
      var newCoord = coordsUp.slice(0, i + 1);
      var startDistance = turf.length(turf.lineString(newCoord), opts);

      var lFactor = startDistance / slopeUpDistance;
      var hFactor = 0.5 + Math.cos(Math.PI - lFactor * Math.PI) / 2;
      if (diff1 > 0) {
        var h = diff1 * hFactor + start;
        coordsUp[i][2] = h.toFixed(2) / 1;
      } else {
        var h = (1 - hFactor) * -diff1 + height;
        coordsUp[i][2] = h.toFixed(2) / 1;
      }

      //console.log(hFactor);
    }

    coordsUp.pop();
  }

  var coordsDown = [];
  if (secondSlopeLength > 0) {
    const slopeDown = turf.lineSliceAlong(
      data,
      lengthBridge - secondSlopeLength,
      lengthBridge,
      opts
    );

    var diff2 = finish - height;

    var fChunk = turf.lineChunk(slopeDown, step, opts);

    fChunk.features.forEach((chunk) => {
      chunk.geometry.coordinates.forEach((coord) => {
        coordsDown.push(coord);
      });
    });

    coordsDown = uniqAry(coordsDown);

    coordsDown[coordsDown.length - 1][2] = finish;
    const slopeDownLength = turf.length(slopeDown, opts);
    for (var i = 1; i < coordsDown.length - 1; i++) {
      var newCoord = coordsDown.slice(0, i + 1);
      var startDistance = turf.length(turf.lineString(newCoord), opts);

      var lFactor = startDistance / slopeDownLength;
      var hFactor = 0.5 + Math.cos(Math.PI - lFactor * Math.PI) / 2;
      if (diff2 > 0) {
        var h = height + hFactor * diff2; //diff2 * -hFactor + start;
        coordsDown[i][2] = h.toFixed(2) / 1;
      } else {
        var h = height - hFactor * -diff2;
        coordsDown[i][2] = h.toFixed(2) / 1;
      }
    }

    coordsDown.shift();
  }

  const flatPart = turf.lineSliceAlong(
    data,
    firstSlopeLength,
    lengthBridge - secondSlopeLength,
    opts
  );

  flatPart.geometry.coordinates.forEach((coord) => {
    coord[2] = height / 1;
  });

  finCoords = coordsUp.concat(flatPart.geometry.coordinates, coordsDown);

  finCoords = uniqAry(finCoords);
  data.geometry.coordinates = finCoords;
}
/*
function extruder(data, start, height, finish) {
  const opts = { units: "meters" };
  const density = 10;
  var coefAngle = 0.06; // 60 промилле = 0.06
  var lengthBridge = turf.length(data, opts);
  var slopeLength = height / coefAngle;

  if (lengthBridge < slopeLength * 2) {
    //Правильно так
    height = ((lengthBridge - 5) / 2) * coefAngle;
    slopeLength = height / coefAngle;
  }

  const step = slopeLength / density - 0.1;

  const coordsUp = [];

  const slopeUp = turf.lineSliceAlong(data, 0, slopeLength, opts);

  //СИНУС
  var diff1 = height - start;
  for (var i = 0; i < density; i++) {
    var along = turf.along(slopeUp, i * step, opts);
    along.geometry.coordinates[2] =
      //(Math.sin((i / density) * (Math.PI / 2)) * height).toFixed(1) / 1;
      start + (Math.sin((i / density) * (Math.PI / 2)) * diff1).toFixed(1) / 1;
    coordsUp.push(along.geometry.coordinates);
  }
  coordsUp.pop();
  const flatPart = turf.lineSliceAlong(
    data,
    slopeLength,
    lengthBridge - slopeLength,
    opts
  );

  const slopeDown = turf.lineSliceAlong(
    data,
    lengthBridge - slopeLength,
    lengthBridge,
    opts
  );

  const coordsDown = [];

 
  var diff2 = height - finish;
  for (var i = 0; i < density + 1; i++) {
    var along = turf.along(slopeDown, i * step, opts);
    along.geometry.coordinates[2] =
      finish + (Math.cos((i / density) * (Math.PI / 2)) * diff2).toFixed(1) / 1;
    //(Math.cos((i / density) * (Math.PI / 2)) * height).toFixed(1) / 1;
    coordsDown.push(along.geometry.coordinates);
  }

  coordsDown.shift();
  flatPart.geometry.coordinates.forEach((coord) => {
    coord[2] = height;
  });

  var finCoords = coordsUp.concat(flatPart.geometry.coordinates, coordsDown);
  ///////////////////
  ////////////////////
  ///////////////////   УБРАТЬ ДУБЛИРОВАНИЕ
  data.geometry.coordinates = finCoords;
}
*/
function extrudeCheck(data, diff) {
  for (var i = 0; i < data.features.length; i++) {
    if (turf.length(data.features[i], { units: "meters" }) > bridgeMinLength) {
      if (
        data.features[i].geometry.type == "LineString" &&
        data.features[i].geometry.coordinates.length > 1
      ) {
        if (data.features[i].properties.layer) {
          extruder(
            data.features[i],
            data.features[i].properties.s * diff,
            data.features[i].properties.layer * diff,
            data.features[i].properties.f * diff
          );
        } /*else {
          console.log(data.features[i]);
          extruder(
            data.features[i],
            data.features[i].properties.s * diff,
            diff,
            data.features[i].properties.f * diff
          );
        }*/
      }
    } else {
      data.features.splice(i, 1);
      i--;
    }
  }

  return data;
}

function shorten(data, gap) {
  data.features.forEach(function (element, index, object) {
    if (turf.length(element, { units: "meters" }) < bridgeMinLength) {
      object.splice(index, 1);
    } else {
      element.geometry.coordinates.forEach((coords) => {
        if (coords.length == 3) {
          coords.pop();
        }
      });
      //gap = ОТСТУП от краев линии
      var length = turf.length(element, { units: "meters" });
      //console.log(length);
      if (length > gap * 3) {
        var sliced = turf.lineSliceAlong(element, gap, length - gap, {
          units: "meters"
        });
        element.geometry.coordinates = sliced.geometry.coordinates;
      }
    }
  });
  return data;
}

export { extruder, extrudeCheck, shorten };
