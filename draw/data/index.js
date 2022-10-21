import html2canvas from "html2canvas";
import SplitPolygonMode from "mapbox-gl-draw-split-polygon-mode";
import CutLineMode from "mapbox-gl-draw-cut-line-mode";
import DrawAssistedRectangle from "@geostarters/mapbox-gl-draw-rectangle-assisted-mode";
import mapboxGlDrawPassingMode from "mapbox-gl-draw-passing-mode";
import {
  CircleMode,
  DragCircleMode,
  DirectMode,
  SimpleSelectMode
} from "mapbox-gl-draw-circle";
import { cadOkruga, cadBboxes } from "./kad.js";
import { Matrix4 } from "@math.gl/core";
import { createExtrusion } from "./tesselate.js";
import { makeShadow } from "./shadowBuilder.js";
import { roundCorners } from "./roundCorners";
import { extruder, extrudeCheck, shorten } from "./bridgeUtils.js";

import { FPSControl } from "mapbox-gl-fps/lib/MapboxFPS.min";

const {
  MapboxLayer,
  GeoJsonLayer,
  DirectionalLight,
  _SunLight,
  LightingEffect
} = deck;

var tpuStyles = require("./tpuStyles.json");
//const { Tiles3DLoader, GLTFLoader, load } = loaders;
//const { MapboxLayer, Tile3DLayer, ScenegraphLayer } = deck;

var mapDOM = document.querySelector("#map");

mapboxgl.accessToken =
  "pk.eyJ1IjoiZW1paWFhaSIsImEiOiJja21icnU4bHkyNGRwMnFrbjVvNXdtdGJ0In0.TcfxV21Ov7zOgvWvgPxzlA";

const map = new mapboxgl.Map({
  container: mapDOM,
  style: "mapbox://styles/emiiaai/ckv9cvgm062s515nz08d6ceq0",
  attributionControl: false,
  center: [37.618, 55.751],
  minZoom: 2,
  zoom: 10,
  bearingSnap: 5,
  antialias: true,
  maxPitch: 60,
  preserveDrawingBuffer: true,
  maxBounds: [
    [36.540169324143605, 55.020305819627616], // Southwest coordinates
    [38.3135420226066969, 56.1505434064830737] // Northeast coordinates
  ]
});

const maxPicSize = 6000;
var qualityExport = 2;
let LOD = 0.8;
let hOffset = 130; //120;
let offsetMatrix = [hOffset * -0.56, hOffset * -0.42, hOffset * -1];
const actualPixelRatio = window.devicePixelRatio;
var metroLineMagnifier = 1;
const bldHeights = [0, 9, 18, 30, 39, 51, 63, 78, 93, 123, 183, 243, 303];

var pickableLayers = [
  "roads",
  "bridges",
  "roads-aip",
  "roads-aip-bridge",
  "tunnels",
  "buildings",
  "cadastre",
  "pathRoadPoly",
  "3d-buildings",
  "gzk"
  //"krt",
  //"personal"
];

const tempPolyData = {
  type: "FeatureCollection",
  features: []
};
var pastFeatures = [];

function saveImage() {
  downloadBar.style.width = "100%";
  html2canvas(mapDOM).then((canvas) => {
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.download = "map.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });

  loadingScreen.style.display = "none";
  condition.saving3D = false;

  Object.defineProperty(window, "devicePixelRatio", {
    get() {
      return actualPixelRatio;
    }
  });
  map.resize();
  tabHide();
  clearInterval(progressBar);
  widthBar = 0;
}

function saveDoubleImage() {
  downloadBar.style.width = "100%";
  html2canvas(mapDOM).then((canvas) => {
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var tempPic = new Image(); // Размер изображения
      tempPic.crossOrigin = "anonymous";
      tempPic.src = url;
      tempPic.onload = () => {
        var tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width / 2;
        tempCanvas.height = canvas.height;
        var tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(tempPic, 0, 0, canvas.width, canvas.height);
        var tempUrl = tempCanvas.toDataURL();
        var link = document.createElement("a");
        link.download = "map-left.png";
        link.href = tempUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        /////
        tempCtx.drawImage(
          tempPic,
          -canvas.width / 2,
          0,
          canvas.width,
          canvas.height
        );
        tempUrl = tempCanvas.toDataURL();
        link = document.createElement("a");
        link.download = "map-right.png";
        link.href = tempUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        tempCanvas.remove();
      };
    });
  });

  loadingScreen.style.display = "none";
  condition.saving3D = false;

  Object.defineProperty(window, "devicePixelRatio", {
    get() {
      return actualPixelRatio;
    }
  });
  map.resize();
  tabHide();
  clearInterval(progressBar);
  widthBar = 0;
}

const emptyGeojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      }
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1.0, 0]
        ]
      }
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-0.3515625, -0.3515602939922709],
            [-0.1318359375, -0.9887204566941844],
            [0.28564453125, -0.8788717828324148],
            [0.46142578125, -0.4174767746707514],
            [-0.3515625, -0.3515602939922709]
          ]
        ]
      }
    }
  ]
};
const dataNullproper = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] }
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0]
        ]
      }
    }
  ]
};
var condition = {
  satellite: false,
  pptNew: false,
  pptOld: false,
  cadastre: false,
  iso: false,
  lanes: false,
  launch: false,
  clearLaunch: false,
  saving3D: false,
  saving2D: false,
  satType: "mka",
  tpuLevel: 0,
  toggleScaleRotate: false,
  toggleMove: false,
  drawUpperLayer: "poi-label",
  satOpacity: 0.7,
  udsConstrPattern: 0,
  buildings: true,
  picking: false,
  bridge: false,
  bridgeWidth: 6,
  bridgeHeight: 9,
  bridgeType: "full",
  bridgeOpacity: 0.8,
  bridgeMaxRadius: 200,
  bridgeQuality: 10, //larger - better 16
  bridgeStepSize: 4, //larger - better 4
  popupRoadName: true,
  popupRoutesCount: true,
  defBridges: true,
  extruded: false,
  delay: 600
};

var originalLines = [];
var geojsonUNITED;
var geojson;
var PPTLIST = [""];
const colorsNGPT = ["#344154", "#045bc3", "#ff6a00", "#24a798"];
var colorCounter = 0;

///IMAGE
var pic;
var canvas;
var ctx;
var canvasTemp;
var ctxTemp;
var picProps = {};
var picRect;
var bboxRect;
var picRectTemp;
var bboxRectTemp;
var polyReset;
var angle = 0;
var resetAngle;
var ratio = 1;
var bearing;
var helperPoints = {};
var fileName;
var extension;
///IMAGE//

const colors = [
  "#ad1a1e",
  "#9b553d",
  "#ff6a00",
  "#fba61c",
  "#3d282c",
  "#8d479b",
  "#ef4c89",
  "#a09798",
  "#000000",
  "#045bc3",
  "#76b4cf",
  "#a7b7b6",
  "#344154",
  "#24a798",
  "#71bf44",
  "#ffffff"
];
const dashes = [
  [1, 0],
  [3, 1],
  [1, 1],
  [0.5, 0.5]
];
const dashNames = ["—", "– –", "•••", "···"];
let geojsonArrow = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        rotation: 90,
        size: 1
      },
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      }
    }
  ]
};
const pathPolyData = {
  type: "FeatureCollection",
  features: []
};
const pathPolyShadowData = {
  type: "FeatureCollection",
  features: []
};
const pathPolyShadowDataMerged = {
  type: "FeatureCollection",
  features: []
};
//
const pathPolyRoadData = {
  type: "FeatureCollection",
  features: []
};
//
const shadowPolyData = {
  type: "FeatureCollection",
  features: []
};
const bldPolyData = {
  type: "FeatureCollection",
  features: []
};
//

var colorDraw = colors[0];
var widthDraw = 2;
var dashDraw = 0;
var arrowState = false;
var drawOpacity = 0.2;
var selectedIds = [];

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(value) {
  var colorArray = value.substring(4, value.length - 1).split(", ");
  //console.log(colorArray);
  var r = parseInt(colorArray[0], 10);
  var g = parseInt(colorArray[1], 10);
  var b = parseInt(colorArray[2], 10);
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function createCustomArrow(color) {
  var canvasArrow = document.createElement("canvas");
  canvasArrow.id = "tempCanvasArrow";
  canvasArrow.width = 32;
  canvasArrow.height = 32;
  var ctxArrow = canvasArrow.getContext("2d");
  ctxArrow.fillStyle = color;
  ctxArrow.beginPath();
  ctxArrow.moveTo(0, 32);
  ctxArrow.lineTo(16, 0);
  ctxArrow.lineTo(32, 32);
  ctxArrow.fill();
  var redArrowGenerate = canvasArrow.toDataURL();
  canvasArrow.remove();
  map.loadImage(redArrowGenerate, function (error, image) {
    if (error) throw error;
    if (!map.hasImage(color)) {
      map.addImage(color, image);
    }
  });
}
colors.forEach((color) => createCustomArrow(color));

function createArrow(e) {
  var id = e.id;
  if (id == undefined) {
    id = e.properties.id;
  }
  var coords = e.geometry.coordinates;
  var type = e.geometry.type;
  if (type === "LineString") {
    var point1 = turf.point(coords[coords.length - 2]);
    var point2 = turf.point(coords[coords.length - 1]);
    var bearing = turf.bearing(point1, point2);
    var currArrow;
    if (arrowState == true) {
      currArrow = colorDraw;
    }
    var feature = {
      type: "Feature",
      properties: {
        id: id,
        rotation: bearing,
        size: 0.1 + widthDraw / 10,
        arrow: currArrow
      },
      geometry: {
        type: "Point",
        coordinates: coords[coords.length - 1]
      }
    };
    geojsonArrow.features.push(feature);
    map.getSource("arrowSource").setData(geojsonArrow);
  }
}

var modes = Object.assign(MapboxDraw.modes, {
  draw_circle: CircleMode,
  drag_circle: DragCircleMode,
  direct_select: DirectMode,
  simple_select: SimpleSelectMode,
  splitPolygonMode: SplitPolygonMode,
  cut_line: CutLineMode,
  draw_assisted_rectangle: DrawAssistedRectangle,
  passing_mode_line_string: mapboxGlDrawPassingMode(
    MapboxDraw.modes.draw_line_string
  )
});

var draw = new MapboxDraw({
  userProperties: true,
  displayControlsDefault: false,
  controls: {
    polygon: true,
    line_string: true,
    point: true,
    trash: true,
    combine_features: true,
    uncombine_features: true
  },
  modes: modes,
  styles: [
    {
      id: "gl-draw-polygon-fill-inactive",
      type: "fill",
      filter: [
        "all",
        ["==", "active", "false"],
        ["==", "$type", "Polygon"],
        ["!=", "mode", "static"]
      ],
      paint: {
        "fill-color": [
          "case",
          ["has", "user_color"],
          ["get", "user_color"],
          colorDraw
        ],
        "fill-opacity": [
          "case",
          ["has", "user_opacity"],
          ["get", "user_opacity"],
          drawOpacity
        ] //0.2
      }
    },
    {
      id: "gl-draw-polygon-fill-active",
      type: "fill",
      filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
      paint: {
        "fill-color": "#fbb03b",
        "fill-outline-color": "#fbb03b",
        "fill-opacity": 0.1
      }
    },
    {
      id: "gl-draw-polygon-midpoint",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
      paint: {
        "circle-radius": 3,
        "circle-color": "#fbb03b"
      }
    },
    {
      id: "gl-draw-polygon-stroke-inactive",
      type: "line",
      filter: [
        "all",
        ["==", "active", "false"],
        ["==", "$type", "Polygon"],
        ["!=", "mode", "static"]
      ],
      layout: {
        "line-cap": "butt",
        "line-join": "round"
      },
      paint: {
        "line-color": [
          "case",
          ["has", "user_color"],
          ["get", "user_color"],
          colorDraw
        ], //"#da2031",
        /*"line-width": [
          "case",
          ["has", "user_width"],
          ["get", "user_width"],
          widthDraw
        ],*/
        "line-width": [
          "case",
          ["==", ["typeof", ["get", "user_height"]], "number"],
          0,
          ["has", "user_width"],
          ["get", "user_width"],

          widthDraw
        ],
        "line-dasharray": [
          "case",
          ["has", "user_dash"],
          ["get", "user_dash"],
          ["literal", dashes[dashDraw]]
        ]
      }
    },
    {
      id: "gl-draw-polygon-stroke-active",
      type: "line",
      filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#fbb03b",
        "line-dasharray": [0.2, 2],
        "line-width": 2.5
      }
    },
    {
      id: "gl-draw-line-inactive",
      type: "line",
      filter: [
        "all",
        ["==", "active", "false"],
        ["==", "$type", "LineString"],
        ["!=", "mode", "static"]
      ],
      layout: {
        "line-cap": "butt",
        "line-join": "round"
      },
      paint: {
        "line-color": [
          "case",
          ["has", "user_color"],
          ["get", "user_color"],
          colorDraw
        ], //"#da2031",
        "line-width": [
          "case",
          ["has", "user_width"],
          ["get", "user_width"],
          widthDraw
        ],
        "line-dasharray": [
          "case",
          ["has", "user_dash"],
          ["get", "user_dash"],
          ["literal", dashes[dashDraw]]
        ]
      }
    },
    {
      id: "gl-draw-line-active",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#fbb03b",
        "line-dasharray": [0.2, 2],
        "line-width": 2
      }
    },
    {
      id: "gl-draw-polygon-and-line-vertex-stroke-inactive",
      type: "circle",
      filter: [
        "all",
        ["==", "meta", "vertex"],
        ["==", "$type", "Point"],
        ["!=", "mode", "static"]
      ],
      paint: {
        "circle-radius": 5,
        "circle-color": "#fff"
      }
    },
    {
      id: "gl-draw-polygon-and-line-vertex-inactive",
      type: "circle",
      filter: [
        "all",
        ["==", "meta", "vertex"],
        ["==", "$type", "Point"],
        ["!=", "mode", "static"]
      ],
      paint: {
        "circle-radius": 3,
        "circle-color": "#fbb03b"
      }
    },
    {
      id: "gl-draw-point-point-stroke-inactive",
      type: "circle",
      filter: [
        "all",
        ["==", "active", "false"],
        ["==", "$type", "Point"],
        ["==", "meta", "feature"],
        ["!=", "mode", "static"]
      ],
      paint: {
        "circle-radius": [
          "case",
          ["has", "user_width"],
          ["+", ["get", "user_width"], 3],
          ["+", widthDraw, 3]
        ], //11,
        "circle-opacity": 1,
        "circle-color": "#fff"
      }
    },
    {
      id: "gl-draw-point-inactive",
      type: "circle",
      filter: [
        "all",
        ["==", "active", "false"],
        ["==", "$type", "Point"],
        ["==", "meta", "feature"],
        ["!=", "mode", "static"]
      ],
      paint: {
        "circle-radius": [
          "case",
          ["has", "user_width"],
          ["get", "user_width"],
          widthDraw
        ], //9,
        "circle-color": [
          "case",
          ["has", "user_color"],
          ["get", "user_color"],
          colorDraw
        ]
        //"circle-color": "#da2031"
      }
    },
    {
      id: "gl-draw-point-stroke-active",
      type: "circle",
      filter: [
        "all",
        ["==", "$type", "Point"],
        ["==", "active", "true"],
        ["!=", "meta", "midpoint"]
      ],
      paint: {
        "circle-radius": 9,
        "circle-color": "#fff"
      }
    },
    {
      id: "gl-draw-point-active",
      type: "circle",
      filter: [
        "all",
        ["==", "$type", "Point"],
        ["!=", "meta", "midpoint"],
        ["==", "active", "true"]
      ],
      paint: {
        "circle-radius": 7,
        "circle-color": "#fbb03b"
      }
    },
    {
      id: "gl-draw-polygon-fill-static",
      type: "fill",
      filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
      paint: {
        "fill-color": "#404040",
        "fill-outline-color": "#404040",
        "fill-opacity": 0.1
      }
    },
    {
      id: "gl-draw-polygon-stroke-static",
      type: "line",
      filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#404040",
        "line-width": 2
      }
    },
    {
      id: "gl-draw-line-static",
      type: "line",
      filter: ["all", ["==", "mode", "static"], ["==", "$type", "LineString"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#404040",
        "line-width": 2
      }
    },
    {
      id: "gl-draw-point-static",
      type: "circle",
      filter: ["all", ["==", "mode", "static"], ["==", "$type", "Point"]],
      paint: {
        "circle-radius": 5,
        "circle-color": "#404040"
      }
    }
  ]
});
map.addControl(draw, "top-right");
map.addControl(
  new mapboxgl.NavigationControl({ showZoom: false, visualizePitch: true })
);
var data1 = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      }
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0]
        ]
      }
    }
  ]
};
var data2 = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      }
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0]
        ]
      }
    }
  ]
};
var data = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: []
      }
    }
  ]
};

function enableSat() {
  document.body.style.setProperty(
    "--popup-background",
    "rgba(255, 255, 255, 0.8)"
  );
  document.body.style.setProperty("--popup-color", "#000");
  map.setPaintProperty("3d-buildings", "fill-extrusion-color", "#ffffff");
  map.setPaintProperty("3d-gzk", "fill-extrusion-color", "#bd9999");
  //map.setPaintProperty("3d-personal", "fill-extrusion-color", "#bd9999");
  //map.setPaintProperty("3d-krt", "fill-extrusion-color", "#bd9999");
  map.setPaintProperty("metroLineWhite", "line-color", "#555");
  map.moveLayer("MCC-red", "poi-label");
  map.moveLayer("MCC-white", "poi-label");
  map.setPaintProperty("poi-label", "text-color", "#ffffff");
  map.setPaintProperty("poi-label", "text-halo-color", "#73565d");
  map.setPaintProperty("poi-label", "text-halo-width", 1);
  map.setPaintProperty("road-label", "text-color", "#ffffff");
  map.setPaintProperty("road-label", "text-halo-color", "#3d292c");
  map.setPaintProperty("address-label", "text-color", "hsla(0, 0%, 100%, 0.8)");
  map.setPaintProperty("rayon-label", "text-halo-color", "#5c4a38");
  map.setPaintProperty("roads-aip", "fill-opacity", 0.75);
  map.setPaintProperty("roads-aip-bridge", "fill-opacity", 0.75);
  map.moveLayer("roads-aip", "tram-stroke");
  map.moveLayer("roads-aip-bridge", "tram-stroke");
}
function disableSat() {
  map.setPaintProperty("3d-buildings", "fill-extrusion-color", "#acb0b9");
  map.setPaintProperty("3d-gzk", "fill-extrusion-color", [
    "match",
    ["get", "tip_obj_eng"],
    ["ZH"],
    "hsl(0, 8%, 68%)",
    "hsl(205, 26%, 76%)"
  ]);
  //map.setPaintProperty("3d-personal", "fill-extrusion-color", "#b4a7a7");
  //map.setPaintProperty("3d-krt", "fill-extrusion-color", "#b4a7a7");
  map.setPaintProperty("metroLineWhite", "line-color", "#fff");
  map.moveLayer("MCC-red", "bridges");
  map.moveLayer("MCC-white", "bridges");
  map.setPaintProperty("poi-label", "text-halo-width", 0);
  map.setPaintProperty("poi-label", "text-color", "#71565c");
  map.setPaintProperty("road-label", "text-color", "#818183");
  map.setPaintProperty("road-label", "text-halo-color", "#ffffff");
  map.setPaintProperty("address-label", "text-color", "#847173");
  map.setPaintProperty("rayon-label", "text-halo-color", "#ffffff");
  map.setPaintProperty("roads-aip", "fill-opacity", 1);
  map.setPaintProperty("roads-aip-bridge", "fill-opacity", 1);
  document.body.style.setProperty(
    "--popup-background",
    "rgba(102, 102, 102, 0.8)"
  );
  document.body.style.setProperty("--popup-color", "#fff");
  map.moveLayer("roads-aip-bridge", "bridges");
  map.moveLayer("roads-aip", "roads");
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
map.loadImage(
  "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/white16x16round.png",
  function (error, image) {
    if (error) throw error;
    if (!map.hasImage("rounded")) {
      map.addImage("rounded", image, {
        content: [0, 0, 16, 16],
        stretchX: [[7, 9]],
        stretchY: [[7, 9]],
        pixelRatio: 2
      });
    }
  }
);

var fileTypes = ["jpg", "jpeg", "png", "gif", "json", "geojson"];
const hide = document.querySelector("#hide");

function panelToggleTaskItem(e) {
  var layers = e.currentTarget.getAttribute("data").split(",");
  if (map.getLayoutProperty(layers[0], "visibility") !== "none") {
    layers.forEach((element) => {
      map.setLayoutProperty(element, "visibility", "none");
    });
    e.currentTarget.classList.remove(`selected`);
  } else {
    layers.forEach((element) => {
      map.setLayoutProperty(element, "visibility", "visible");
    });
    e.currentTarget.classList.add(`selected`);
  }
}
/////existing bridges

var road3dLayer;
var roadThickLayer;
//var roadShadowLayer;

var defBridges;

var newBridgeColor = [255, 255, 255, 200];
fetch(
  "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/b220908-raw_processed.json" //b220902 //b220902-p
)
  .then((response) => response.json())
  .then((commits) => {
    defBridges = commits;
    /*
    extrudedBridges = extrudeCheck(JSON.parse(JSON.stringify(defBridges)), 5); //5-высота перепада
    extrudedBridges.features.push({
      type: "Feature",
      properties: { ground: true },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [37.19833374023437, 55.48118816890478],
            [37.979736328125, 55.48118816890478],
            [37.979736328125, 55.985323315237835],
            [37.19833374023437, 55.985323315237835],
            [37.19833374023437, 55.48118816890478]
          ]
        ]
      }
    });
*/
    // extrudedBridgesShadow = defBridges; //shorten(JSON.parse(JSON.stringify(defBridges)), 2);
    function lower(data, delta) {
      for (var i = 0; i < data.features.length; i++) {
        if (data.features[i].geometry.type == "Polygon") {
          data.features.splice(i, 1);
          i--;
        } else {
          for (
            var o = 0;
            o < data.features[i].geometry.coordinates.length;
            o++
          ) {
            data.features[i].geometry.coordinates[o][2] -= delta;
          }
        }
      }
      return data;
    }

    road3dLayer = new MapboxLayer({
      id: "road3d",
      type: GeoJsonLayer,
      visible: false,
      data: defBridges, //extrudedBridges, //extrudeCheck(JSON.parse(JSON.stringify(defBridges)), 5), //extrudeCheck(JSON.parse(JSON.stringify(roadData)), 0, 10, 0),
      //stroked: false,
      lineWidthScale: 1, //12,
      lineJointRounded: true,
      getLineColor: (d) =>
        d.properties.state ? newBridgeColor : [255, 255, 255, 200],
      /*getLineColor: (d) =>
        d.properties.state ? [232, 248, 248, 200] : [255, 255, 255, 200], //[255, 255, 255, 200],*/
      getLineWidth: (d) => d.properties.lanes * 3.5 + 4,
      getFillColor: [0, 0, 0, 0]
    });

    roadThickLayer = new MapboxLayer({
      id: "roadThick",
      type: GeoJsonLayer,
      visible: false,
      data: lower(JSON.parse(JSON.stringify(defBridges)), 2), //extrudeCheck(JSON.parse(JSON.stringify(roadData)), 0, 10, 0),

      lineWidthScale: 1, //12,
      lineJointRounded: true,
      getLineColor: [185, 185, 185, 200],
      getLineWidth: (d) => d.properties.lanes * 3.5 + 4
    });
    /*
    roadShadowLayer = new MapboxLayer({
      id: "roadShadow",
      type: GeoJsonLayer,
      data: extrudedBridgesShadow, //shorten(JSON.parse(JSON.stringify(defBridges)), 2), //shorten(JSON.parse(JSON.stringify(roadData)), 8),
      //stroked: false,
      lineWidthScale: 1,
      lineJointRounded: true,
      //lineCapRounded: true,
      getLineColor: [0, 34, 51, 255], //56
      getLineWidth: (d) => d.properties.lanes * 3.5 + 4,
      opacity: 0
    });*/
  });

//////////////////////
map.on("load", function () {
  map.setLight({
    color: "hsl(0, 0%, 100%)",
    anchor: "viewport",
    intensity: 0.2 //0.15
  });
  map.setFog({
    range: [1.0, 12.0],
    color: "white",
    "horizon-blend": 0.1
  });
  map.addSource("metroLineSource", {
    type: "geojson",
    data:
      "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/Metro-lines.geojson"
  });
  map.addSource("tpuSource", {
    type: "geojson",
    data:
      "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/tpu220811.geojson" //"https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/tpu.geojson"
  });
  map.addSource("shadowSource", {
    type: "geojson",
    lineMetrics: true,
    data:
      "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/tunnel-line.geojson"
  });

  //
  map.addSource("shadowBldSource", {
    type: "geojson",
    data: shadowPolyData
  });
  map.addSource("bldPolySource", {
    type: "geojson",
    data: bldPolyData
  });
  //
  map.addLayer(
    {
      id: "shadows-tunnel",
      type: "line",
      source: "shadowSource",
      minzoom: 13,
      paint: {
        "line-color": "#000",
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.3],
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 2, 18, 15],
        "line-blur": ["interpolate", ["linear"], ["zoom"], 13, 2, 18, 15],
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "transparent",
          0.2,
          "black",
          0.8,
          "black",
          1,
          "transparent"
        ]
      },
      layout: {
        "line-join": "round"
      }
    },
    "rail-dash"
  );
  map.addLayer(
    {
      id: "shadows-tunnel-mask",
      type: "line",
      source: "shadowSource",
      minzoom: 13,
      paint: {
        "line-color": [
          "match",
          ["get", "type"],
          "white",
          "#f4f5f6",
          "gray",
          "#dfe0e2",
          "#cbd8bc"
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 18, 7],
        "line-offset": ["interpolate", ["linear"], ["zoom"], 14, -1, 18, -4]
      },
      layout: {
        "line-join": "miter",
        "line-cap": "round"
      }
    },
    "rail-dash"
  );

  /*  map.addLayer(
    {
      id: "bridgeShadow",
      type: "line",
      source: {
        type: "geojson",
        lineMetrics: true,
        data:
          "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/bridge-shadow2.geojson"
      },
      minzoom: 12,
      paint: {
        "line-color": "#000",
        "line-opacity": 0.25,
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "transparent",
          0.15,
          "black",
          0.85,
          "black",
          1,
          "transparent"
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 22, 45],
        "line-blur": ["interpolate", ["linear"], ["zoom"], 12, 3, 22, 45]
      },
      layout: {
        "line-join": "round"
      }
    },
    "bridges"
  );*/

  map.addLayer(
    {
      id: "metroLineWhite",
      type: "line",
      source: "metroLineSource",
      paint: {
        "line-color": "#fff",
        "line-opacity": 0.6,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          ["*", metroLineMagnifier, 6], //6
          13,
          ["*", metroLineMagnifier, 14] //14,
          /* 14,
          ["*", metroLineMagnifier, 4], //4,
          20,
          ["*", metroLineMagnifier, 10] //10*/
        ],
        "line-blur": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          ["*", metroLineMagnifier, 4], //4,
          13,
          ["*", metroLineMagnifier, 8] //8,
          /*14,
          ["*", metroLineMagnifier, 4], //4,
          20,
          ["*", metroLineMagnifier, 8] //8*/
        ]
        /*"line-gap-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13.5,
          0,
          14,
          ["*", metroLineMagnifier, 6], //6,
          19,
          ["*", metroLineMagnifier, 24] //24
        ]*/
      },
      filter: ["match", ["get", "railway"], ["rail"], false, true]
    },
    "poi-label"
  );
  map.addLayer(
    {
      id: "metroLine",
      type: "line",
      source: "metroLineSource",
      paint: {
        "line-color": ["get", "colour"],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 18, 0.45],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          ["*", metroLineMagnifier, 2],
          14,
          ["*", metroLineMagnifier, 6],
          20,
          ["*", metroLineMagnifier, 16]
        ] /*[
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          ["*", metroLineMagnifier, 2], //2
          13,
          ["*", metroLineMagnifier, 6], //6
          14,
          ["*", metroLineMagnifier, 2],
          20,
          ["*", metroLineMagnifier, 6]
        ]*/

        /*"line-gap-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13.5,
          0,
          14,
          ["*", metroLineMagnifier, 4], //4,
          19,
          ["*", metroLineMagnifier, 20] //20
        ]*/
      },

      filter: [
        "match",
        ["get", "railway"],
        ["rail", "construction"],
        false,
        true
      ]
    },
    "poi-label"
  );
  map.addLayer(
    {
      id: "metroLine-constructing",
      type: "line",
      source: "metroLineSource",

      paint: {
        "line-color": ["get", "colour"],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 18, 0.45],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          ["*", metroLineMagnifier, 2],
          14,
          ["*", metroLineMagnifier, 6],
          20,
          ["*", metroLineMagnifier, 16]
        ] /*[
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          ["*", metroLineMagnifier, 2],
          13,
          ["*", metroLineMagnifier, 6],
          14,
          ["*", metroLineMagnifier, 2],
          20,
          ["*", metroLineMagnifier, 6]
        ],*/,
        /*"line-gap-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13.5,
          0,
          14,
          ["*", metroLineMagnifier, 4], //4,
          19,
          ["*", metroLineMagnifier, 20] //20
        ],*/
        "line-dasharray": [2, 1]
      },
      filter: ["match", ["get", "railway"], ["construction"], true, false]
    },
    "poi-label"
  );
  map.addLayer(
    {
      id: "MCC-red",
      type: "line",
      source: "metroLineSource",
      paint: {
        "line-color": ["get", "colour"],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.6, 18, 0.4],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          ["*", metroLineMagnifier, 10], //10,
          14,
          ["*", metroLineMagnifier, 14] //14
        ],
        "line-blur": 6,
        "line-offset": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          [
            "interpolate",
            ["linear"],
            ["get", "MCD"],
            1,
            -3,
            2,
            3,
            3,
            -6,
            4,
            3,
            5,
            0
          ],
          19,
          [
            "interpolate",
            ["linear"],
            ["get", "MCD"],
            1,
            -9,
            2,
            9,
            3,
            -18,
            4,
            9,
            5,
            0
          ]
        ]
      },

      filter: ["match", ["get", "railway"], ["rail"], true, false]
    },
    "bridges" //"poi-label"
  );
  map.addLayer(
    {
      id: "MCC-white",
      type: "line",
      source: "metroLineSource",
      paint: {
        "line-color": "#ffffff",
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.6, 17, 0.2],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          ["*", metroLineMagnifier, 3], //3,
          14,
          ["*", metroLineMagnifier, 6] // 6
        ],
        "line-offset": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          [
            "interpolate",
            ["linear"],
            ["get", "MCD"],
            1,
            -3,
            2,
            3,
            3,
            -6,
            4,
            3,
            5,
            0
          ],
          19,
          [
            "interpolate",
            ["linear"],
            ["get", "MCD"],
            1,
            -9,
            2,
            9,
            3,
            -18,
            4,
            9,
            5,
            0
          ]
        ]
      },

      filter: ["match", ["get", "railway"], ["rail"], true, false]
    },
    "bridges" //"poi-label"
  );
  map.addLayer({
    id: "rail-stations",
    source: "tpuSource",
    minzoom: 10,
    type: "circle",
    filter: [
      "all",
      ["match", ["get", "level"], [1, 10], true, false],
      ["match", ["get", "railway"], ["construction-perspective"], false, true]
    ],
    paint: {
      "circle-color": [
        "match",
        ["get", "railway"],
        ["construction"],
        "#918484",
        ["construction,construction"],
        "#918484",
        [",construction"],
        "#918484",
        ["construction-perspective"],
        "#918484",
        ["stop"],
        "#848a91",
        "hsl(4, 86%, 53%)"
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 12, 3.5],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#fff"
    }
  });
  map.addLayer({
    id: "tpu",
    type: "symbol",
    source: "tpuSource",
    minzoom: 11.5,
    layout: {
      "text-field":
        tpuStyles.styleDays /*[
        "format",
        ["image", ["case", ["in", "q", ["get", "lineNumber"]], "1m", ""]],
        ["image", ["case", ["in", "w", ["get", "lineNumber"]], "2m", ""]],
        ["image", ["case", ["in", "e", ["get", "lineNumber"]], "3m", ""]],
        ["image", ["case", ["in", "r", ["get", "lineNumber"]], "4m", ""]],
        ["image", ["case", ["in", "t", ["get", "lineNumber"]], "5m", ""]],
        ["image", ["case", ["in", "y", ["get", "lineNumber"]], "6m", ""]],
        ["image", ["case", ["in", "u", ["get", "lineNumber"]], "7m", ""]],
        ["image", ["case", ["in", "i", ["get", "lineNumber"]], "8m", ""]],
        ["image", ["case", ["in", "o", ["get", "lineNumber"]], "9m", ""]],
        ["image", ["case", ["in", "p", ["get", "lineNumber"]], "10m", ""]],
        ["image", ["case", ["in", "a", ["get", "lineNumber"]], "11m", ""]],
        ["image", ["case", ["in", "s", ["get", "lineNumber"]], "12m", ""]],
        ["image", ["case", ["in", "d", ["get", "lineNumber"]], "13m", ""]],
        ["image", ["case", ["in", "f", ["get", "lineNumber"]], "14m", ""]],
        ["image", ["case", ["in", "g", ["get", "lineNumber"]], "15m", ""]],
        ["image", ["case", ["in", "h", ["get", "lineNumber"]], "16m-s", ""]],
        ["image", ["case", ["in", "j", ["get", "lineNumber"]], "17m-s", ""]],
        ["image", ["case", ["in", "k", ["get", "lineNumber"]], "18m-s", ""]],
        ["image", ["case", ["in", "l", ["get", "lineNumber"]], "d1", ""]],
        ["image", ["case", ["in", "z", ["get", "lineNumber"]], "d2", ""]],
        ["image", ["case", ["in", "x", ["get", "lineNumber"]], "d3", ""]],
        ["image", ["case", ["in", "c", ["get", "lineNumber"]], "d4", ""]],
        ["image", ["case", ["in", "v", ["get", "lineNumber"]], "d5", ""]],
        ["image", ["case", ["==", null, ["get", "lineNumber"]], "r", ""]],
        " ",
        ["get", "NameOfStation"],
        [
          "case",
          [">", ["to-number", ["get", "hour"]], 0],
          ["concat", "\n", ["get", "hour"], " тыс. чел./ч"],
          ""
        ],
        {
          "font-scale": 0.8,
          "text-font": [
            "literal",
            ["Moscow Sans Regular", "Arial Unicode MS Regular"]
          ]
        }
      ]*/,
      "icon-image": "rounded",
      "icon-text-fit-padding": [-4, 4, 0, 4],
      "icon-text-fit": "both",
      "text-size": 14,
      "text-font": ["Moscow Sans Medium", "Arial Unicode MS Regular"] //["Raleway Bold", "Arial Unicode MS Regular"] //["Moscow Sans Medium", "Arial Unicode MS Regular"]
    },
    paint: {
      "text-color": "#4e3c42",
      //"text-translate": [0, 4],
      "text-halo-color": "hsla(0, 0%, 100%, 0.6)",
      "text-halo-width": 1
    },
    filter: ["in", "level", 0, 10]
  });

  map.addSource("drawLineS", {
    type: "geojson",
    data: emptyGeojson
  });

  map.addLayer({
    id: "drawLine",
    type: "line",
    source: "drawLineS",
    paint: {
      "line-color": "#ef4c89",
      "line-opacity": 0.8,
      "line-width": 3
    }
  });
  map.addSource("satSource", {
    type: "raster",
    //[ "https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1030.0&projection=web_mercator&x={x}&y={y}&z={z}&scale=2&lang=ru_RU" ],
    tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
    tileSize: 128,
    scheme: "xyz"
  });
  map.addLayer(
    {
      id: "sat",
      source: "satSource",
      type: "raster",
      paint: {
        "raster-opacity": condition.satOpacity
      },
      layout: {
        visibility: "none"
      }
    },
    "tram-stroke"
  );

  map.addSource("⚙ ППТ_source", {
    type: "vector",
    url: "mapbox://yanpogutsa.cgqe35yy"
  });

  map.addLayer(
    {
      id: "ППТ",
      type: "fill",
      source: "⚙ ППТ_source",
      "source-layer": "PPT-0r9jki",
      filter: ["all", ["match", ["get", "STATUS"], "", true, false]],
      paint: {
        "fill-pattern": [
          "match",
          ["get", "STATUS"],
          ["Утвержденные, действующие"],
          "peattern2",
          "peattern1"
        ],
        "fill-opacity": 0.5
        // "fill-outline-color": "hsla(213, 98%, 38%, 0.6)"
      }
    },
    "tram-stroke"
  );
  map.addLayer(
    {
      id: "ППТ_line",
      type: "line",
      source: "⚙ ППТ_source",
      "source-layer": "PPT-0r9jki",
      filter: ["all", ["match", ["get", "STATUS"], "", true, false]],
      paint: {
        "line-color": [
          "match",
          ["get", "STATUS"],
          ["Планируемые, в работе", "В разработке, в работе"],
          "#0257be",
          "#02b790"
        ],
        "line-width": 1,
        "line-opacity": 0.3
      }
    },
    "tram-stroke"
  );
  map.addLayer(
    {
      id: "temp-PPT",
      type: "fill",
      source: "⚙ ППТ_source",
      "source-layer": "PPT-0r9jki",
      filter: ["in", "OBJECTID", ""],
      paint: {
        "fill-color": "#dc2d04",
        "fill-opacity": 0.3
      }
    },
    "tram-stroke"
  );
  map.addSource("isoPtSource", {
    type: "geojson",
    data: emptyGeojson
  });
  map.addLayer({
    id: "isoPt",
    type: "circle",
    source: "isoPtSource",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 15, 10],
      "circle-color": "rgba(255, 85, 117, 0.7)",
      "circle-stroke-color": "#fff",
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 16, 3]
    }
  });
  map.addSource("isoSourceUNITED", {
    type: "geojson",
    data: emptyGeojson
  });
  map.addLayer(
    {
      id: "isoUNITED",
      type: "fill",
      source: "isoSourceUNITED",
      paint: {
        "fill-pattern": "pattern-pink",
        "fill-opacity": 0.4
      },
      layout: { visibility: "visible" }
    }
    //"buildings-13ut9s"
  );
  map.addLayer(
    {
      id: "isoUNITED-line",
      type: "line",
      source: "isoSourceUNITED",
      paint: {
        "line-color": "#ef4c89",
        "line-opacity": 0.65,
        "line-width": 1,
        "line-dasharray": [2, 1]
      },
      layout: { visibility: "visible" }
    }
    //"buildings-13ut9s"
  );
  map.addSource("isoSource", {
    type: "geojson",
    data: emptyGeojson
  });
  map.addLayer(
    {
      id: "iso",
      type: "fill",
      source: "isoSource",
      paint: {
        "fill-color": "#ef4c89",
        "fill-opacity": 0.14
      },
      layout: { visibility: "none" }
    }
    //"buildings-13ut9s"
  );

  map.addLayer({
    id: "isoText",
    type: "symbol",
    source: "isoSource",
    paint: {
      "text-color": "#ef4c89",
      "text-halo-color": "hsla(0, 0%, 100%, 0.5)",
      "text-halo-width": 1.5
    },
    layout: {
      "text-field": ["concat", ["get", "population_rs"], " чел."],
      "text-font": ["Ubuntu Mono Regular"],
      "text-size": 8
    }
  });

  map.addLayer({
    id: "isoLine",
    type: "line",
    source: "isoSource",
    paint: {
      "line-color": "#ef4c89",
      "line-opacity": 0.65,
      "line-width": 1,
      "line-dasharray": [2, 1]
    }
  });
  /////////////////////////////////////ROUTES

  map.addSource("helperS", {
    type: "geojson",
    data: data1
  });
  map.addSource("helperS2", {
    type: "geojson",
    data: data2
  });
  map.addSource("rectS", {
    type: "geojson",
    data: data
  });
  map.addLayer({
    id: "rect",
    type: "fill",
    source: "rectS",
    paint: {
      "fill-color": "hsla(213, 98%, 38%, 0.8)",
      "fill-opacity": 0
    },
    layout: { visibility: "none" }
  });
  map.addSource("rectS2", {
    type: "geojson",
    data: data
  });
  map.addLayer({
    id: "rect2",
    type: "fill",
    source: "rectS2",
    paint: {
      "fill-color": "hsla(322, 100%, 73%, 0.8)",
      "fill-opacity": 0
    }
  });

  map.addLayer({
    id: "helper-p",
    type: "circle",
    source: "helperS",
    paint: {
      "circle-color": "hsl(213, 98%, 38%)",
      "circle-radius": 5
    }
  });
  map.addLayer({
    id: "helper-l",
    type: "line",
    source: "helperS",
    paint: {
      "line-color": "hsl(213, 98%, 38%)",
      "line-width": 3,
      "line-dasharray": [3, 1]
    }
  });
  map.addLayer({
    id: "helper-p2",
    type: "circle",
    source: "helperS2",
    paint: {
      "circle-color": "#F5B22F",
      "circle-radius": 5
    }
  });
  map.addLayer({
    id: "helper-l2",
    type: "line",
    source: "helperS2",
    paint: {
      "line-color": "#F5B22F",
      "line-dasharray": [3, 1],
      "line-width": 3
    }
  });
  /*map.addLayer(
    {
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 15,
      paint: {
        "fill-extrusion-color": "#acb0b9", //"#a69d95",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.6
      },
      layout: {
        visibility: "none"
      }
    },
    "poi-label"
  );*/
  //
  map.addLayer(
    {
      id: "shadowBld",
      type: "fill",
      source: "shadowBldSource",
      minzoom: 13.5,
      paint: {
        "fill-color": "#023",
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13.5,
          0,
          14.5,
          0.22
        ] //0.25
      }
    },
    "3d-buildings"
  );
  map.addLayer({
    id: "bldAmbient",
    type: "line",
    source: "bldPolySource",
    minzoom: 14,
    paint: {
      "line-color": "#000",
      "line-opacity": 0.25,
      "line-width": [
        "interpolate",
        ["exponential", 1.96],
        ["zoom"],
        14,
        3,
        19,
        50
      ],
      "line-blur": [
        "interpolate",
        ["exponential", 1.96],
        ["zoom"],
        14,
        3,
        19,
        50
      ]
    },
    layout: {
      "line-join": "round"
    }
  });
  map.addLayer({
    id: "bldPoly",
    type: "fill-extrusion",
    source: "bldPolySource",
    paint: {
      "fill-extrusion-color": [
        "case",
        ["has", "color"],
        ["get", "color"],
        colorDraw
      ],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-opacity": condition.bridgeOpacity
    }
  });
  //
  map.addSource("pathPolySource", {
    type: "geojson",
    data: pathPolyData
  });
  map.addSource("pathPolyShadowSource", {
    type: "geojson",
    data: pathPolyShadowData
  });
  map.addSource("pathPolyRoadSource", {
    type: "geojson",
    data: pathPolyRoadData
  });
  map.addLayer(
    {
      id: "pathRoadPoly",
      type: "fill",
      source: "pathPolyRoadSource",
      paint: {
        "fill-color": ["case", ["has", "color"], ["get", "color"], colorDraw],
        "fill-opacity": 0.6
      }
    },
    "tram-line"
  );
  map.addLayer(
    {
      id: "pathShadowPoly",
      type: "fill",
      source: "pathPolyShadowSource",
      paint: {
        "fill-color": "#023",
        "fill-opacity": 0.22
      }
    },
    "tram-line"
  );

  map.addLayer(
    {
      id: "extrudedPathPoly",
      type: "fill-extrusion",
      source: "pathPolySource",
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-opacity": condition.bridgeOpacity
      }
    },
    "road-label"
  );

  hide.style.display = "inline";
  //////////////////////////////////YNDX
  map.addSource("yndxSource", {
    type: "raster",
    tiles: [
      "https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=2&projection=web_mercator"
    ],
    tileSize: 256 / actualPixelRatio,
    scheme: "xyz"
  });

  map.addLayer(
    {
      id: "yndx",
      source: "yndxSource",
      type: "raster",

      layout: {
        visibility: "none"
      }
    },
    "tram-stroke"
  );
  //////////////////////////////////////ARROWS/DRAWS
  map.addSource("arrowSource", {
    type: "geojson",
    data: geojsonArrow
  });
  map.addLayer({
    id: "arrow",
    type: "symbol",
    source: "arrowSource",
    layout: {
      "icon-image": ["get", "arrow"],
      "icon-rotate": ["get", "rotation"],
      "icon-size": ["get", "size"],
      "icon-ignore-placement": true,
      "icon-rotation-alignment": "map"
    }
  });
  //////////////////////////////////////////
  // temp draw
  map.addSource("tempPolySource", {
    type: "geojson",
    data: tempPolyData
  });
  map.addLayer({
    id: "tempPoly",
    type: "fill",
    source: "tempPolySource",
    paint: {
      "fill-color": "#3FB1CE",
      "fill-opacity": 0.3
    }
  });

  /////////////////////////////////////////////////TPUFILTER
  map.on("zoom", () => {
    var currZoom = map.getZoom();
    if (currZoom > 14.5 && condition.tpuLevel == 0) {
      condition.tpuLevel = 1;
      map.setFilter("tpu", ["in", "level", 1, 10]);
    }
    if (currZoom < 14.5 && condition.tpuLevel == 1) {
      condition.tpuLevel = 0;
      map.setFilter("tpu", ["in", "level", 0, 10]);
    }
    if (condition.defBridges) {
      if (currZoom > 14.5) {
        if (!road3dLayer.props.visible) {
          road3dLayer.setProps({ visible: true });
          roadThickLayer.setProps({ visible: true });
          //map.setLayoutProperty("bridges", "visibility", "none");
          //map.setLayoutProperty("bridge-shadow", "visibility", "none");
        }
      } else {
        if (road3dLayer.props.visible) {
          road3dLayer.setProps({ visible: false });
          roadThickLayer.setProps({ visible: false });
          //map.setLayoutProperty("bridges", "visibility", "visible");
          //map.setLayoutProperty("bridge-shadow", "visibility", "visible");
        }
      }
    }
    /*
    if (condition.defBridges) {
      if (currZoom > 13) {
        if (!map.getLayer("road3d")) {
          var startTime = performance.now();
          //map.addLayer(roadShadowLayer, "tram-stroke");
          //map.addLayer(road3dLayer, "tram-stroke");
          road3dLayer.setProps({ visible: true });
          map.once("sourcedataloading", (e) => {
            var endTime = performance.now();
            console.log(
              `Мосты выдавились за ${(endTime - startTime).toFixed(
                1
              )} милисекунд`
            );
          });
        }
      } else {
        console.log();
        if (map.getLayer("road3d")) {
          map.removeLayer("road3d");
          // map.removeLayer("roadShadow");
        }
      }
    }
    */
  });
  /////////////////////////////////////////////////PANEL
  ////////////////////////////////////////////////LAYER
  const tasksListElement = document.querySelector(`.tasks__list`);
  const taskElements = tasksListElement.querySelectorAll(`.tasks__item`);

  for (const task of taskElements) {
    task.draggable = true;
    task.addEventListener("click", (e) => {
      var layers = e.currentTarget.getAttribute("data").split(",");
      if (layers[0] == "cadastre") {
        if (condition.cadastre === true) {
          map.setLayoutProperty("cadastre", "visibility", "none");
          map.setFilter("cadastre", ["in", "kad_number", ""]);
          e.currentTarget.classList.remove(`selected`);
          condition.cadastre = false;
        } else {
          if (!map.getSource("cadastreSource")) {
            map.addSource("cadastreSource", {
              type: "vector",
              scheme: "xyz",

              tiles: ["https://isogd.mos.ru/map/vtiles/14/{z}/{x}/{y}.pbf"],
              minzoom: 10
            });

            map.addLayer(
              {
                id: "cadastre",
                type: "line",
                source: "cadastreSource",
                "source-layer": "isogd_kad_zu",
                paint: {
                  "line-color": "#ea7782",
                  "line-opacity": 0.8,
                  "line-width": 0.5
                },
                filter: ["in", "kad_number", ""]
              },
              "tram-stroke"
            );
          }
          map.setLayoutProperty("cadastre", "visibility", "visible");
          map.setFilter("cadastre", null);
          e.currentTarget.classList.add(`selected`);
          condition.cadastre = true;
        }
      } /*else if (layers[0] == "tileset") {
        if (condition.launch == false) {
          enableSat();
          map.addLayer(
            tilesetLayer,
            "roads-aip" //"poi-label"
          );
          condition.launch = true;
          e.currentTarget.classList.add(`selected`);
        } else {
          disableSat();
          map.removeLayer("tileset");
          condition.launch = false;
          e.currentTarget.classList.remove(`selected`);
        }
      }*/ else if (
        layers[0] == "sat"
      ) {
        if (condition.satellite == false) {
          enableSat();
          map.setLayoutProperty("sat", "visibility", "visible");
          condition.satellite = true;
          e.currentTarget.classList.add(`selected`);
        } else {
          disableSat();
          map.setLayoutProperty("sat", "visibility", "none");
          condition.satellite = false;
          e.currentTarget.classList.remove(`selected`);
        }
      } else if (layers[0] == "buildings") {
        if (condition.buildings == false) {
          layers.forEach((element) => {
            map.setLayoutProperty(element, "visibility", "visible");
          });
          condition.buildings = true;
          e.currentTarget.classList.add(`selected`);
        } else {
          layers.forEach((element) => {
            map.setLayoutProperty(element, "visibility", "none");
          });
          condition.buildings = false;
          e.currentTarget.classList.remove(`selected`);
        }
      } else if (e.currentTarget.id == "ППТ-old") {
        if (condition.pptOld === true) {
          PPTLIST = PPTLIST.filter((e) => e !== "Утвержденные, действующие");
          e.currentTarget.classList.remove(`selected`);
          condition.pptOld = false;
        } else {
          PPTLIST.push("Утвержденные, действующие");
          e.currentTarget.classList.add(`selected`);
          condition.pptOld = true;
        }
        map.setFilter("ППТ", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
        map.setFilter("ППТ_line", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
      } else if (e.currentTarget.id == "ППТ-new") {
        if (condition.pptNew === true) {
          PPTLIST = PPTLIST.filter((e) => e !== "В разработке, в работе");
          PPTLIST = PPTLIST.filter((e) => e !== "Планируемые, в работе");
          e.currentTarget.classList.remove(`selected`);
          condition.pptNew = false;
        } else {
          PPTLIST.push("В разработке, в работе");
          PPTLIST.push("Планируемые, в работе");
          e.currentTarget.classList.add(`selected`);
          condition.pptNew = true;
        }
        map.setFilter("ППТ", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
        map.setFilter("ППТ_line", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
      } else if (layers[0] == "lgr") {
        if (!map.getSource("lgrSource")) {
          map.addSource("lgrSource", {
            type: "vector",
            scheme: "xyz",
            tiles: ["https://isogd.mos.ru/map/vtiles/200/{z}/{x}/{y}.pbf"],
            minzoom: 12
          });

          map.addLayer(
            {
              id: "lgr",
              type: "line",
              source: "lgrSource",
              "source-layer": "lgr_l1",
              paint: {
                "line-color": "#ea7782",
                "line-opacity": 0.8,
                "line-width": 1.5
              },
              layout: {
                visibility: "none"
              }
            },
            "tram-stroke"
          );
        }
        if (map.getLayoutProperty(layers[0], "visibility") !== "none") {
          layers.forEach((element) => {
            map.setLayoutProperty(element, "visibility", "none");
          });
          e.currentTarget.classList.remove(`selected`);
        } else {
          layers.forEach((element) => {
            map.setLayoutProperty(element, "visibility", "visible");
          });
          e.currentTarget.classList.add(`selected`);
        }
        ///
      } else if (e.currentTarget.id == "PPT-container") {
      } else if (layers[0] == "road3d") {
        if (condition.defBridges) {
          condition.defBridges = false;
          e.currentTarget.classList.remove(`selected`);
          if (map.getLayer("road3d")) {
            map.removeLayer("road3d");
            map.removeLayer("roadThick");
            //map.setLayoutProperty("bridges", "visibility", "visible");
            //map.setLayoutProperty("bridge-shadow", "visibility", "visible");
            // map.removeLayer("roadShadow");
          }
        } else {
          condition.defBridges = true;
          e.currentTarget.classList.add(`selected`);
          if (!map.getLayer("road3d")) {
            //map.setLayoutProperty("bridges", "visibility", "none");
            //map.setLayoutProperty("bridge-shadow", "visibility", "none");
            map.addLayer(road3dLayer, "tram-stroke" /*"1.14.3-1.15"*/);
            map.addLayer(roadThickLayer, "tram-stroke" /*"1.14.3-1.15"*/);

            if (!road3dLayer.props.visible) {
              road3dLayer.setProps({ visible: true });
              roadThickLayer.setProps({ visible: true });
            }
          }
        }
      } else {
        if (map.getLayoutProperty(layers[0], "visibility") !== "none") {
          layers.forEach((element) => {
            map.setLayoutProperty(element, "visibility", "none");
          });
          e.currentTarget.classList.remove(`selected`);
        } else {
          layers.forEach((element) => {
            map.setLayoutProperty(element, "visibility", "visible");
          });
          e.currentTarget.classList.add(`selected`);
        }
      }
    });
  }

  const taskSubElements = tasksListElement.querySelectorAll(`.tasks__subitem`);
  for (const task of taskSubElements) {
    task.addEventListener("click", (e) => {
      if (e.currentTarget.id == "ППТ-new") {
        if (condition.pptNew === true) {
          PPTLIST = PPTLIST.filter((e) => e !== "В разработке, в работе");
          PPTLIST = PPTLIST.filter((e) => e !== "Планируемые, в работе");
          e.currentTarget.classList.remove(`selected`);
          condition.pptNew = false;
        } else {
          PPTLIST.push("В разработке, в работе");
          PPTLIST.push("Планируемые, в работе");
          e.currentTarget.classList.add(`selected`);
          condition.pptNew = true;
        }
        map.setFilter("ППТ", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
        map.setFilter("ППТ_line", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
      } else if (e.currentTarget.id == "ППТ-old") {
        if (condition.pptOld === true) {
          PPTLIST = PPTLIST.filter((e) => e !== "Утвержденные, действующие");
          e.currentTarget.classList.remove(`selected`);
          condition.pptOld = false;
        } else {
          PPTLIST.push("Утвержденные, действующие");
          e.currentTarget.classList.add(`selected`);
          condition.pptOld = true;
        }
        map.setFilter("ППТ", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
        map.setFilter("ППТ_line", [
          "all",
          ["match", ["get", "STATUS"], PPTLIST, true, false]
        ]);
      } else if (e.currentTarget.id == "sat-mka") {
        if (condition.satellite == false) {
          enableSat();
          map.setLayoutProperty("sat", "visibility", "visible");
          condition.satellite = true;
          e.currentTarget.classList.add(`selected`);
        } else {
          disableSat();
          map.setLayoutProperty("sat", "visibility", "none");
          condition.satellite = false;
          e.currentTarget.classList.remove(`selected`);
        }
        if (condition.satType === "google") {
          condition.satType = "mka";
          document.querySelector("#sat-google").classList.remove(`selected`);
          document.querySelector("#sat-mka").classList.add(`selected`);
          enableSat();
          map.removeLayer("sat");
          map.removeSource("satSource");

          map.addSource("satSource", {
            type: "raster",
            tiles: [
              "https://smart.mos.ru/geoserver/gwc/service/tms/1.0.0/ecp:samolet_2020_afcy00189@EPSG:900913/{z}/{x}/{y}.jpeg"
            ],
            tileSize: 128,
            scheme: "tms"
          });
          if (map.getLayer("tileset")) {
            map.addLayer(
              {
                id: "sat",
                source: "satSource",
                type: "raster",
                paint: {
                  "raster-opacity": 0.55
                }
              },
              "tileset"
            );
          } else {
            map.addLayer(
              {
                id: "sat",
                source: "satSource",
                type: "raster",
                paint: {
                  "raster-opacity": 0.55
                }
              },
              "tram-stroke"
            );
          }
        }
      } else if (e.currentTarget.id == "sat-google") {
        if (condition.satellite == false) {
          enableSat();
          map.setLayoutProperty("sat", "visibility", "visible");
          condition.satellite = true;
          e.currentTarget.classList.add(`selected`);
        } else {
          disableSat();
          map.setLayoutProperty("sat", "visibility", "none");
          condition.satellite = false;
          e.currentTarget.classList.remove(`selected`);
        }
        if (condition.satType === "mka") {
          condition.satType = "google";
          document.querySelector("#sat-mka").classList.remove(`selected`);
          document.querySelector("#sat-google").classList.add(`selected`);
          enableSat();
          map.removeLayer("sat");
          map.removeSource("satSource");

          map.addSource("satSource", {
            type: "raster",
            tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
            tileSize: 128,
            scheme: "xyz"
          });
          if (map.getLayer("tileset")) {
            map.addLayer(
              {
                id: "sat",
                source: "satSource",
                type: "raster",
                paint: {
                  "raster-opacity": 0.55
                }
              },
              "tileset"
            );
          } else {
            map.addLayer(
              {
                id: "sat",
                source: "satSource",
                type: "raster",
                paint: {
                  "raster-opacity": 0.55
                }
              },
              "tram-stroke"
            );
          }
        }
      }
    });
  }

  tasksListElement.addEventListener(`dragstart`, (evt) => {
    evt.target.classList.add(`hovered`);
  });

  tasksListElement.addEventListener(`dragend`, (evt) => {
    evt.target.classList.remove(`hovered`);
  });

  tasksListElement.addEventListener(`dragover`, (evt) => {
    dragoverLayerstack(evt);
  });
  ////////////////////////////////EXISTING BRIDGES
  if (condition.defBridges) {
    //map.addLayer(roadShadowLayer, "tram-stroke");
    //map.addLayer(dummyEarthLayer, "tram-stroke");
    map.addLayer(road3dLayer, "tram-stroke" /*"1.14.3-1.15"*/);
    map.addLayer(roadThickLayer, "tram-stroke" /*"1.14.3-1.15"*/);

    //map.setLayoutProperty("bridges", "visibility", "none");
    //map.setLayoutProperty("bridge-shadow", "visibility", "none");

    /*const dir1 = new DirectionalLight({
      color: [255, 255, 255],
      intensity: 100,
      direction: [0, 0, -100000],
      _shadow: true
    });*/

    const sun = new _SunLight({
      timestamp: 1655907840000, //1655283600000, //1661766733641,
      color: [255, 255, 255],
      intensity: 1,
      _shadow: true
    });

    const lightingEffect = new LightingEffect({
      //dir1
      sun
    });
    lightingEffect.shadowColor = [0, 0.14, 0.2, 0.23]; //0.25

    map.__deck.props.effects = [lightingEffect];
  }

  map.setPaintProperty("3d-buildings", "fill-extrusion-opacity", 0);
  //map.setPaintProperty("3d-buildings", "fill-extrusion-height", 0);
  map.setPaintProperty("3d-buildings", "fill-extrusion-opacity-transition", {
    duration: condition.delay
  });

  map.setPaintProperty("3d-gzk", "fill-extrusion-opacity", 0);
  //map.setPaintProperty("3d-buildings", "fill-extrusion-height", 0);
  map.setPaintProperty("3d-gzk", "fill-extrusion-opacity-transition", {
    duration: condition.delay
  });

  map.setPaintProperty("buildings", "fill-opacity-transition", {
    duration: condition.delay
  });
  map.setPaintProperty("gzk", "fill-opacity-transition", {
    duration: condition.delay
  });
  map.setPaintProperty("gzk-case", "line-opacity-transition", {
    duration: condition.delay
  });
});

const getNextElement = (cursorPosition, currentElement) => {
  // Получаем объект с размерами и координатами
  const currentElementCoord = currentElement.getBoundingClientRect();
  // Находим вертикальную координату центра текущего элемента
  const currentElementCenter =
    currentElementCoord.y + currentElementCoord.height / 2;

  // Если курсор выше центра элемента, возвращаем текущий элемент
  // В ином случае — следующий DOM-элемент
  const nextElement =
    cursorPosition < currentElementCenter
      ? currentElement
      : currentElement.nextElementSibling;

  return nextElement;
};

function dragoverLayerstack(evt) {
  evt.preventDefault();
  const tasksListElement = document.querySelector(`.tasks__list`);
  const activeElement = tasksListElement.querySelector(`.hovered`);
  const currentElement = evt.target;

  const isMoveable =
    activeElement !== currentElement &&
    currentElement.classList.contains(`tasks__item`);

  if (!isMoveable) {
    return;
  }

  // evt.clientY — вертикальная координата курсора в момент,
  // когда сработало событие
  const nextElement = getNextElement(evt.clientY, currentElement);

  // Проверяем, нужно ли менять элементы местами
  if (
    (nextElement && activeElement === nextElement.previousElementSibling) ||
    activeElement === nextElement
  ) {
    // Если нет, выходим из функции, чтобы избежать лишних изменений в DOM
    return;
  }

  tasksListElement.insertBefore(activeElement, nextElement);
  if (activeElement.previousElementSibling) {
    var topLayer = activeElement.previousElementSibling
      .getAttribute("data")
      .split(",")[0];
    var currentLayers = activeElement.getAttribute("data").split(",");
    currentLayers.forEach((layer) => {
      map.moveLayer(layer, topLayer);
    });
  } else {
    var currentLayers = activeElement.getAttribute("data").split(",");
    currentLayers.forEach((layer) => {
      map.moveLayer(layer);
    });
  }
}

const layersButton = document.querySelector("#layersButton");
var layersDOM = document.querySelector("#layersDOM");
layersButton.addEventListener("click", () => {
  layersDOM.style.width = tab.offsetWidth - 6 + "px";
  if (layersDOM.style.display == "none") {
    layersDOM.style.display = "block";
    layersButton.className += " active";
  } else {
    layersDOM.style.display = "none";
    layersButton.className = "headerButton";
  }
});

map.on("draw.create", function (e) {
  var id = e.features[0].id;
  var height = parseInt(bldHeightInput.value);
  if (condition.bridge == false && condition.road == false) {
    draw.setFeatureProperty(id, "color", colorDraw);
    draw.setFeatureProperty(id, "width", widthDraw);
    draw.setFeatureProperty(id, "dash", dashes[dashDraw]);
    //draw.setFeatureProperty(id, "arrow", arrowState);
    draw.setFeatureProperty(id, "opacity", drawOpacity);
    createArrow(e.features[0]);
  }
  if (e.features[0].geometry.type == "Polygon" && height > 0) {
    e.features[0].properties.id = id;
    var bld = createExtrusion(e.features[0]);
    bld.properties.color = colorDraw;
    draw.setFeatureProperty(id, "height", bld.properties.height);
    bldPolyData.features.push(bld);
    shadowPolyData.features.push(makeShadow(bld));
    map.getSource("bldPolySource").setData(bldPolyData);
    map.getSource("shadowBldSource").setData(shadowPolyData);
  }
  if (e.features[0].geometry.type == "LineString" && condition.bridge == true) {
    draw.setFeatureProperty(id, "bridge", true);
    draw.setFeatureProperty(id, "width", 0);
    draw.setFeatureProperty(id, "widthBridge", condition.bridgeWidth);
    draw.setFeatureProperty(id, "radiusBridge", condition.bridgeMaxRadius);
    draw.setFeatureProperty(id, "color", colorDraw);
    draw.setFeatureProperty(id, "bridgeType", condition.bridgeType);
    draw.setFeatureProperty(id, "bridgeHeight", condition.bridgeHeight);
    createBridge(e.features[0]);
    condition.bridge = false;
  }
  if (e.features[0].geometry.type == "LineString" && condition.road == true) {
    draw.setFeatureProperty(id, "road", true);
    draw.setFeatureProperty(id, "width", 0);
    draw.setFeatureProperty(id, "widthBridge", condition.bridgeWidth);
    draw.setFeatureProperty(id, "radiusBridge", condition.bridgeMaxRadius);
    draw.setFeatureProperty(id, "color", colorDraw);
    createRoad(e.features[0]);
    condition.road = false;
  }
  if (e.features[0].geometry.type == "Point") {
    draw.setFeatureProperty(id, "width", widthDraw * 3);
  }
  if (!document.getElementById("drawingLayers")) {
    var DOMdrawing = document.createElement("li");
    DOMdrawing.className = "tasks__item selected";
    DOMdrawing.setAttribute(
      "data",
      "gl-draw-polygon-fill-inactive.cold,gl-draw-polygon-fill-active.cold,gl-draw-polygon-midpoint.cold,gl-draw-polygon-stroke-inactive.cold,gl-draw-polygon-stroke-active.cold,gl-draw-line-inactive.cold,gl-draw-line-active.cold,gl-draw-polygon-and-line-vertex-stroke-inactive.cold,gl-draw-polygon-and-line-vertex-inactive.cold,gl-draw-point-point-stroke-inactive.cold,gl-draw-point-inactive.cold,gl-draw-point-stroke-active.cold,gl-draw-point-active.cold,gl-draw-polygon-fill-static.cold,gl-draw-polygon-stroke-static.cold,gl-draw-line-static.cold,gl-draw-point-static.cold,gl-draw-polygon-fill-inactive.hot,gl-draw-polygon-fill-active.hot,gl-draw-polygon-midpoint.hot,gl-draw-polygon-stroke-inactive.hot,gl-draw-polygon-stroke-active.hot,gl-draw-line-inactive.hot,gl-draw-line-active.hot,gl-draw-polygon-and-line-vertex-stroke-inactive.hot,gl-draw-polygon-and-line-vertex-inactive.hot,gl-draw-point-point-stroke-inactive.hot,gl-draw-point-inactive.hot,gl-draw-point-stroke-active.hot,gl-draw-point-active.hot,gl-draw-polygon-fill-static.hot,gl-draw-polygon-stroke-static.hot,gl-draw-line-static.hot,gl-draw-point-static.hot"
      //"gl-draw-polygon-fill-inactive.cold,gl-draw-polygon-fill-inactive.hot,gl-draw-polygon-stroke-inactive.cold,gl-draw-polygon-stroke-inactive.hot"
    );
    DOMdrawing.id = "drawingLayers";
    DOMdrawing.draggable = "true";

    DOMdrawing.addEventListener("click", (e) => {
      panelToggleTaskItem(e);
    });
    DOMdrawing.addEventListener(`dragstart`, (evt) => {
      evt.target.classList.add(`hovered`);
    });

    DOMdrawing.addEventListener(`dragend`, (evt) => {
      evt.target.classList.remove(`hovered`);
    });

    DOMdrawing.addEventListener(`dragover`, (evt) => {
      dragoverLayerstack(evt);
    });

    var miniPic = document.createElement("div");
    miniPic.innerHTML = '<i class="fas fa-draw-polygon"></i>';
    miniPic.id = "drawIllustration";
    miniPic.style.fontSize = "20px";
    miniPic.style.display = "flex";
    miniPic.style.justifyContent = "center";
    miniPic.style.alignItems = "center";
    miniPic.style.background = colorDraw;
    miniPic.style.filter = "grayscale(0.5)";
    miniPic.className = "layerIllustration";

    DOMdrawing.appendChild(miniPic);

    DOMdrawing.innerHTML += "Пользовательская<br>геометрия";

    document.querySelector(".tasks__list").appendChild(DOMdrawing);
  }
});

map.on("draw.modechange", (e) => {
  if (condition.toggleScaleRotate === true) {
    toggleGeoreference();
  }
});

map.on("draw.selectionchange", (e) => {
  selectedIds = e.features;
  if (e.features.length > 0) {
    if (condition.picking == false) {
      pastFeatures = [];
      e.features.forEach((feature) => {
        pastFeatures.push(feature);
      });
    }
    var type = e.features[0].geometry.type;
    if (
      type !== "Point" &&
      e.features[0].properties.bridge !== true &&
      e.features[0].properties.road !== true
    ) {
      //SET COLOR
      var currColor = e.features[0].properties.color;
      if (currColor) {
        if (currColor.length > 7) {
          currColor = rgbToHex(currColor);
        }
        colorDraw = currColor;

        for (var i = 0; i < colors.length; i++) {
          var elem = document.getElementsByClassName("colorButton")[i];
          elem.classList.remove("active");
        }
        var elemColor = document.getElementsByClassName("colorButton")[
          colors.indexOf(colorDraw)
        ];
        if (elemColor) {
          elemColor.classList.add("active");
        }

        if (document.getElementById("drawIllustration")) {
          document.getElementById(
            "drawIllustration"
          ).style.background = colorDraw;
        }
      }

      ///////SET WIDTH
      var currWidth = e.features[0].properties.width;
      if (currWidth) {
        setWidth(currWidth);
      }

      ///////SET DASH
      var currDash = e.features[0].properties.dash;
      if (currDash) {
        setDash(findDashIndex(currDash));
      }

      if (type === "Polygon") {
        var currOpacity = e.features[0].properties.opacity;
        if (currOpacity) {
          if (typeof currOpacity == "number") {
            setOpacity(currOpacity);
          }
        }
      }
    }
    if (
      e.features[0].geometry.type == "LineString" &&
      e.features[0].properties.bridge == true
    ) {
      var currBridgeWidth = e.features[0].properties.widthBridge;
      if (currBridgeWidth && condition.bridgeWidth !== currBridgeWidth) {
        condition.bridgeWidth = currBridgeWidth;
        widthBridgeSelector.value = condition.bridgeWidth;
        widthBridgeSelectorLabel.innerHTML = condition.bridgeWidth;
      }
      var currBridgeRadius = e.features[0].properties.radiusBridge;
      if (currBridgeRadius && condition.bridgeMaxRadius !== currBridgeRadius) {
        condition.currBridgeRadius = currBridgeRadius;
        radiusSelector.value = condition.bridgeMaxRadius;
        radiusSelectorLabel.innerHTML = condition.bridgeMaxRadius;
      }
      var currColorBridge = e.features[0].properties.color;
      if (currColorBridge) {
        if (currColorBridge.length > 7) {
          currColorBridge = rgbToHex(currColorBridge);
        }
        colorDraw = currColorBridge;

        for (var i = 0; i < colors.length; i++) {
          var elem = document.getElementsByClassName("colorButton")[i];
          elem.classList.remove("active");
        }
        var elemColor = document.getElementsByClassName("colorButton")[
          colors.indexOf(colorDraw)
        ];
        if (elemColor) {
          elemColor.classList.add("active");
        }

        if (document.getElementById("drawIllustration")) {
          document.getElementById(
            "drawIllustration"
          ).style.background = colorDraw;
        }
      }

      var currBridgeHeight = e.features[0].properties.bridgeHeight;
      if (currBridgeHeight && condition.bridgeHeight !== currBridgeHeight) {
        condition.bridgeHeight = currBridgeHeight;
        if (heightBridgeSelector) {
          heightBridgeSelector.value = condition.bridgeHeight;
          heightBridgeSelectorLabel.innerHTML = condition.bridgeHeight;
        }
      }
      var currBridgeType = e.features[0].properties.bridgeType;
      leftBridgeButton.classList.remove("active");
      fullBridgeButton.classList.remove("active");
      rightBridgeButton.classList.remove("active");
      var nameType = currBridgeType + "BridgeButton";
      eval(nameType).classList.add("active");
      condition.bridgeType = currBridgeType;
    }
    if (
      e.features[0].geometry.type == "LineString" &&
      e.features[0].properties.bridge !== true &&
      e.features[0].properties.road !== true
    ) {
      //////SET ARROW
      var currArrow = geojsonArrow.features.filter(
        (feature) => feature.properties.id == e.features[0].id
      );
      if (currArrow.length > 0) {
        if (currArrow[0].properties.arrow) {
          if (!arrowButton.classList[1]) {
            arrowButton.classList.add("active");
            arrowState = true;
          }
        }
      } else {
        createArrow(e.features[0]);
      }
    }
  }
});

var popupPop;
var popGeo;
map.on("contextmenu", "gl-draw-polygon-fill-inactive.cold", (e) => {
  //console.log(e);
  if (!e.originalEvent.ctrlKey) {
    e.preventDefault();

    var selected = draw.getSelected().features[0];
    var area = (turf.area(selected) / 10000).toFixed(2);
    var count = 0;
    if (!popGeo) {
      popupPop = new mapboxgl.Popup({ closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(
          '<div id="dots"><div class="lds-grid"  style="position:relative"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>'
        )
        .addTo(map);
      fetch(
        "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/pops-corr.geojson"
      )
        .then((response) => response.json())
        .then((commits) => {
          popGeo = commits;
          var ptsWithin = turf.pointsWithinPolygon(popGeo, selected);
          ptsWithin.features.forEach((feature) => {
            if (feature.properties.cnt) {
              count += parseInt(feature.properties.cnt);
            }
          });
          popupPop._content.firstChild.innerHTML =
            "Население:</br>" +
            count +
            " чел.</br></br>Площадь:</br>" +
            area +
            " Га";
        });
    } else {
      var ptsWithin = turf.pointsWithinPolygon(popGeo, selected);
      ptsWithin.features.forEach((feature) => {
        if (feature.properties.cnt) {
          count += parseInt(feature.properties.cnt);
        }
      });
      popupPop = new mapboxgl.Popup({ closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(
          "Население:</br>" +
            count +
            " чел.</br></br>Площадь:</br>" +
            area +
            " Га"
        )
        .addTo(map);
    }
  }
});

map.on("contextmenu", "gl-draw-polygon-fill-inactive.cold", (e) => {
  if (e.originalEvent.ctrlKey) {
    e.preventDefault();
    console.log("ANUSSSSS");
  }
});

map.on("contextmenu", (e) => {
  e.preventDefault();
  const bbox = [
    [e.point.x - 5, e.point.y - 5],
    [e.point.x + 5, e.point.y + 5]
  ];
  const selectedFeatures = map.queryRenderedFeatures(bbox, {
    layers: ["gl-draw-line-inactive.cold", "gl-draw-line-active.hot"]
  });
  if (
    selectedFeatures.length > 0 &&
    selectedFeatures[0].properties.bridge !== true
  ) {
    var id = selectedFeatures[0].properties.id;
    var selected = draw.get(id);
    var lengthString;
    var length = turf.length(selected, { units: "kilometers" });
    if (length < 1) {
      lengthString = parseInt(length * 1000) + " м";
    } else {
      lengthString = length.toFixed(2) + " км";
    }
    popupPop = new mapboxgl.Popup({ closeOnClick: true })
      .setLngLat(e.lngLat)
      .setHTML("Длина:</br>" + lengthString)
      .addTo(map);
  }
});

map.on("draw.update", function (e) {
  e.features.forEach((feature) => {
    if (
      feature.geometry.type == "LineString" &&
      feature.properties.bridge == true
    ) {
      cleanGeojsonBridge(feature.id);
      createBridge(feature);
    } else if (
      feature.geometry.type == "LineString" &&
      feature.properties.road == true
    ) {
      cleanGeojsonRoad(feature.id);
      createRoad(feature);
    } else if (
      feature.geometry.type == "LineString" &&
      feature.properties.bridge !== true &&
      feature.properties.road !== true
    ) {
      var id = feature.id;
      var arrow;
      var size = 0.1 + widthDraw / 10;
      for (var i = 0; i < geojsonArrow.features.length; i++) {
        if (geojsonArrow.features[i].properties.id === id) {
          arrow = geojsonArrow.features[i].properties.arrow;
          size = geojsonArrow.features[i].properties.size;
          geojsonArrow.features.splice(i, 1);
        }
      }
      var coords = feature.geometry.coordinates;

      var point1 = turf.point(coords[coords.length - 2]);
      var point2 = turf.point(coords[coords.length - 1]);
      var bearing = turf.bearing(point1, point2);
      var featureArrow = {
        type: "Feature",
        properties: {
          id: id,
          rotation: bearing,
          arrow: arrow,
          size: size
        },
        geometry: {
          type: "Point",
          coordinates: coords[coords.length - 1]
        }
      };

      geojsonArrow.features.push(featureArrow);
      map.getSource("arrowSource").setData(geojsonArrow);
      if (feature.properties.radiusBridge) {
        //radiusLineString(feature, feature.properties.radiusBridge);
        var straightLine;
        for (var i = 0; i < originalLines.length; i++) {
          if (originalLines[i].id == id) {
            draw.delete(id);
            delete originalLines[i].properties.radiusBridge;

            draw.add(originalLines[i]);

            draw.changeMode(`simple_select`, { featureIds: [id] });
            originalLines.splice(i, 1);
          }
        }
      }
    } else if (
      feature.geometry.type == "Polygon" &&
      feature.properties.height
    ) {
      var id = feature.id;
      cleanBlds(id);
      feature.properties.id = id;
      bldPolyData.features.push(feature);
      shadowPolyData.features.push(makeShadow(feature));
      map.getSource("bldPolySource").setData(bldPolyData);
      map.getSource("shadowBldSource").setData(shadowPolyData);
    }
  });
});

map.on("draw.delete", function (e) {
  e.features.forEach((feature) => {
    if (
      feature.geometry.type == "LineString" &&
      feature.properties.bridge == true
    ) {
      cleanGeojsonBridge(feature.id);
      map.getSource("pathPolySource").setData(pathPolyData);
      pathPolyShadowDataMerged.features = mergePolygonsBack(pathPolyShadowData);
      map.getSource("pathPolyShadowSource").setData(pathPolyShadowDataMerged);
    } else if (
      feature.geometry.type == "LineString" &&
      feature.properties.bridge !== true &&
      feature.properties.road !== true
    ) {
      for (var i = 0; i < geojsonArrow.features.length; i++) {
        if (geojsonArrow.features[i].properties.id === feature.id) {
          geojsonArrow.features.splice(i, 1);
          i--;
        }
        map.getSource("arrowSource").setData(geojsonArrow);
      }
    } else if (
      feature.geometry.type == "LineString" &&
      feature.properties.road == true
    ) {
      cleanGeojsonRoad(feature.id);
      map.getSource("pathPolyRoadSource").setData(pathPolyRoadData);
    } else if (
      feature.geometry.type == "Polygon" &&
      feature.properties.height
    ) {
      var id = feature.id;
      cleanBlds(id);
      map.getSource("bldPolySource").setData(bldPolyData);
      map.getSource("shadowBldSource").setData(shadowPolyData);
    }
  });
});

function setColor(e) {
  for (var i = 0; i < colors.length; i++) {
    var elem = document.getElementsByClassName("colorButton")[i];
    elem.classList.remove("active");
  }
  e.currentTarget.classList.add("active");
  var currColor = e.currentTarget.style.background;
  if (currColor.length > 7) {
    currColor = rgbToHex(currColor);
  }
  colorDraw = currColor;
  var selected = draw.getSelected();

  selected.features.forEach((feature) => {
    draw.setFeatureProperty(feature.id, "color", colorDraw);
    if (
      feature.geometry.type == "LineString" &&
      feature.properties.bridge !== true &&
      feature.properties.road !== true
    ) {
      const index = geojsonArrow.features
        .map((e) => e.properties.id)
        .indexOf(feature.id);
      if (geojsonArrow.features[index].properties.arrow) {
        geojsonArrow.features[index].properties.arrow = colorDraw;
      }
      map.getSource("arrowSource").setData(geojsonArrow);
    }
    if (
      feature.geometry.type == "LineString" &&
      feature.properties.bridge == true
    ) {
      cleanGeojsonBridge(feature.id);
      createBridge(feature);
    }
    if (feature.geometry.type == "Polygon" && feature.properties.height) {
      bldPolyData.features.forEach((element) => {
        if (element.properties.id == feature.id || element.id == feature.id) {
          element.properties.color = colorDraw;
        }
      });
      map.getSource("bldPolySource").setData(bldPolyData);
    }

    if (document.getElementById("drawIllustration")) {
      document.getElementById("drawIllustration").style.background = colorDraw;
    }
  });
}

function setArrow(e) {
  if (arrowState == false) {
    arrowState = true;
    arrowButton.classList.add("active");
  } else {
    arrowState = false;
    arrowButton.classList.remove("active");
  }
  if (selectedIds.length > 0) {
    for (var o = 0; o < selectedIds.length; o++) {
      var currId = selectedIds[o].id;
      var type = selectedIds[o].geometry.type;
      if (type == "LineString" && selectedIds[o].properties.bridge !== true) {
        for (var i = 0; i < geojsonArrow.features.length; i++) {
          if (geojsonArrow.features[i].properties.id === currId) {
            var currColor = draw.get(currId).properties.color;
            if (geojsonArrow.features[i].properties.arrow) {
              geojsonArrow.features[i].properties.arrow = undefined;
            } else {
              geojsonArrow.features[i].properties.arrow = currColor;
            }
            map.getSource("arrowSource").setData(geojsonArrow);
          }
        }
      }
    }
  }
}
function setOffset(e) {
  if (selectedIds.length > 0) {
    let offset = prompt("Параллельный контур, м\n(ширина корпуса: -15м)", 100);
    for (var o = 0; o < selectedIds.length; o++) {
      var currElement = selectedIds[o];

      if (currElement.geometry.type == "LineString") {
        var coords = currElement.geometry.coordinates;
        var props = draw.get(currElement.id).properties;
        var line = turf.lineString(coords);
        var offsetLine = turf.lineOffset(line, offset, { units: "meters" });
        offsetLine.properties = props;
        var addedDrawId = draw.add(offsetLine);
        var addedDraw = draw.get(addedDrawId);
        createArrow(addedDraw);
      } else if (
        currElement.geometry.type == "Polygon" ||
        currElement.geometry.type == "MultiPolygon"
      ) {
        if (currElement.properties.height) {
          cleanBlds(currElement.id);
          map.getSource("bldPolySource").setData(bldPolyData);
          map.getSource("shadowBldSource").setData(shadowPolyData);
        }
        let props = currElement.properties;
        var buffered = turf.buffer(currElement, offset, {
          units: "meters",
          steps: 2
        });
        var difference = turf.difference(currElement, buffered);
        if (difference) {
          draw.delete(currElement.id);
          difference.properties = props;
          draw.add(difference);
        } else {
          buffered.properties = props;
          draw.add(buffered);
        }
      } else {
        alert("Выбери линию или полигон!");
      }
    }
  }
}

function pickProperty(e) {
  if (selectedIds.length > 0) {
    condition.picking = true;
    map.getCanvas().style.cursor = `crosshair`;
    map.once("draw.selectionchange", (e) => {
      map.getCanvas().style.cursor = "";
      if (e.features.length > 0) {
        if (e.features[0].properties.bridge !== true) {
          var newProps = e.features[0].properties;
          pastFeatures.forEach((feature) => {
            for (let [key, value] of Object.entries(newProps)) {
              //console.log(`${key}: ${value}`);
              draw.setFeatureProperty(feature.id, key, value);
            }
            var type = feature.geometry.type;
            if (type === "LineString") {
              for (var i = 0; i < geojsonArrow.features.length; i++) {
                if (geojsonArrow.features[i].properties.id === feature.id) {
                  geojsonArrow.features[i].properties.size =
                    0.1 + newProps.width / 10;
                  geojsonArrow.features[i].properties.arrow = newProps.color;
                }
                map.getSource("arrowSource").setData(geojsonArrow);
              }
            }
          });
        }
      }
      condition.picking = false;
    });
  } else {
    alert("Выбери что-нибудь!");
  }
}

function reverseLine(e) {
  if (selectedIds.length > 0) {
    for (var o = 0; o < selectedIds.length; o++) {
      var currElement = selectedIds[o];
      if (currElement.geometry.type == "LineString") {
        let currId = currElement.id;
        draw.delete(currId);
        for (var i = 0; i < geojsonArrow.features.length; i++) {
          if (geojsonArrow.features[i].properties.id === currId) {
            geojsonArrow.features.splice(i, 1);
          }
          map.getSource("arrowSource").setData(geojsonArrow);
        }
        currElement.geometry.coordinates = currElement.geometry.coordinates
          .slice()
          .reverse();
        draw.add(currElement);

        createArrow(currElement);
      } else {
        alert("Выбери линию!");
      }
    }
  }
}

/////////////////////////////ROUTES
const ngptDOM = document.querySelector("#ngptDOM");
const ngptCount = document.querySelector("#ngptCountDOM");

var routesList = [];
ngptDOM.addEventListener("click", (e) => {
  for (var i = 0; i < routesList.length; i++) {
    map.removeLayer(routesList[i]);
    map.removeLayer(routesList[i] + "-text");
    map.removeLayer(routesList[i] + "-outline");
  }
  for (i = 0; i < routesList.length; i++) {
    routesList.splice(routesList[i], 1);
  }
  //}
  routesList = [];
  colorCounter = 0;
  ngptCount.textContent = routesList.length;
  ngptDOM.style.display = "none";
});

map.on("click", "ngpt-stops", function (e) {
  /////////////////////////ROUTES
  if (!map.getSource("routes")) {
    map.addSource("routes", {
      type: "geojson",
      data:
        "https://raw.githubusercontent.com/yan-map/yan-map.github.io/master/data/NGPT-ROUTES-superlight.json"
    });
  }
  let features = map.queryRenderedFeatures(e.point, {
    layers: ["ngpt-stops"]
  });

  let routes = features[0].properties.route_ids;
  let routeFix = routes.split(",");

  routesList = routesList.reduce(function (a, b) {
    if (a.indexOf(b) < 0) a.push(b);
    return a;
  }, []);

  let tempRoutes = [];

  for (var i = 0; i < routeFix.length; i++) {
    if (!routesList.includes(routeFix[i]) /* && !routeFix[i].match(/Н/)*/) {
      tempRoutes.push(routeFix[i]);
    }
  }
  routeFix = tempRoutes;

  for (i = 0; i < routeFix.length; i++) {
    routesList.push(routeFix[i]);
  }

  for (i = 0; i < routeFix.length; i++) {
    var colorCode;
    if (colorCounter < 3) {
      colorCode = colorCounter;
    } else {
      colorCode = colorCounter % 4;
    }
    map.addLayer(
      {
        id: routeFix[i] + "-outline",
        type: "line",
        source: "routes",
        filter: ["in", "route_id", parseInt(routeFix[i])],
        paint: {
          "line-color": "#ffffff", //routeColors[i],
          "line-width": 3.5, //1.5,
          "line-offset": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0,
            14.5,
            2 * i
          ] //2 * i
        }
      },
      "address-label"
    );
    map.addLayer(
      {
        id: routeFix[i],
        type: "line",
        source: "routes",
        filter: ["in", "route_id", parseInt(routeFix[i])],
        paint: {
          "line-color": colorsNGPT[colorCode], //routeColors[i],
          "line-opacity": 0.85,
          "line-width": 1.5, //1.5,
          "line-offset": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0,
            14.5,
            2 * i
          ] //2 * i
        }
      },
      "address-label"
    );
    map.addLayer(
      {
        id: routeFix[i] + "-text",
        type: "symbol",
        source: "routes",
        filter: ["in", "route_id", parseInt(routeFix[i])],
        layout: {
          "text-field": ["to-string", ["get", "route_short_name"]],
          "text-size": 8,
          "symbol-placement": "line",
          "text-font": ["Montserrat Bold"],
          "icon-image": "c" + colorCode + "-square", //"c4" + "-square",
          "icon-text-fit": "both",
          "icon-size": 1,
          "icon-text-fit-padding": [1, 2, 1, 2]
        },
        paint: {
          "text-color": "#fff",
          "icon-opacity": 0.8 //routeColors[i]
        }
      },
      "road-label"
    );
    colorCounter++;
  }

  ngptCount.textContent = routesList.length;
  ngptDOM.style.display = "block";
});
map.on("mouseenter", "ngpt-stops", function () {
  map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "ngpt-stops", function () {
  map.getCanvas().style.cursor = "";
});

///////////////////////ISO
function toggleIso(i) {
  condition.lanes = false;
  popButton.className = "headerButton";
  if (condition.iso === false) {
    map.setLayoutProperty("iso", "visibility", "visible");
    i.currentTarget.className += " active";

    function isoTrack(e) {
      let dataUrl =
        "https://gis01.rumap.ru/4898/serviceAreaStatistics?guid=DDC7AEA4-1BDA-1019-A30D-1CD07F74BEED&type=pedestrianZone&x=" +
        e.lngLat.lng +
        "&y=" +
        e.lngLat.lat +
        "&maxdist=300&geometry=1";
      function getData() {
        $.ajax({
          url: dataUrl,
          type: "GET",
          dataType: "json",
          cache: false
        }).done(function (oldData) {
          geojson = oldData;
          map.getSource("isoSource").setData(geojson);
        });
      }
      getData();

      if (geojsonUNITED == null) {
        geojsonUNITED = geojson;
        map.getSource("isoSourceUNITED").setData(geojsonUNITED);
      } else {
        var currentCoords = geojsonUNITED.features[0].geometry.coordinates;
        var existingCoords = geojson.features[0].geometry.coordinates;

        var poly1 = turf.multiPolygon(currentCoords);

        var poly2 = turf.multiPolygon(existingCoords);

        var union = turf.union(poly1, poly2);

        geojsonUNITED.features[0] = union;
        map.getSource("isoSourceUNITED").setData(geojsonUNITED);
      }
    }

    map.once("click", function (e) {
      if (condition.iso === true) {
        isoTrack(e);
        let coords = e.lngLat;
        let geojson = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [coords.lng, coords.lat]
              }
            }
          ]
        };
        map.getSource("isoPtSource").setData(geojson);
      }
    });
    //////
    map.on("mouseenter", "isoPt", function () {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "isoPt", function () {
      map.setPaintProperty("isoPt", "circle-color", "rgba(255, 85, 117, 0.7)");
      map.getCanvas().style.cursor = "";
    });
    function onMove(e) {
      var coords = e.lngLat;
      var geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [0, 0]
            }
          }
        ]
      };
      var radius = 0.4;
      var options = { steps: 48, units: "kilometers" };
      var circleGeojson = turf.circle(
        [coords.lng, coords.lat],
        radius,
        options
      );
      // Set a UI indicator for dragging.
      map.getCanvas().style.cursor = "grabbing";
      geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
      map.getSource("isoPtSource").setData(geojson);
      map.getSource("isoSource").setData(circleGeojson);
    }

    function onUp(e) {
      isoTrack(e);
      map.getCanvas().style.cursor = "";

      // Unbind mouse/touch events
      map.off("mousemove", onMove);
      map.off("touchmove", onMove);
    }

    map.on("mousedown", "isoPt", function (e) {
      map.setPaintProperty("isoPt", "circle-color", "#be2e4b");

      // Prevent the default map drag behavior.
      e.preventDefault();

      map.getCanvas().style.cursor = "grab";

      map.on("mousemove", onMove);
      map.once("mouseup", onUp);
    });

    map.on("touchstart", "isoPt", function (e) {
      if (e.points.length !== 1) return;

      // Prevent the default map drag behavior.
      e.preventDefault();

      map.on("touchmove", onMove);
      map.once("touchend", onUp);
    });
    condition.iso = true;
  } else {
    map.setLayoutProperty("iso", "visibility", "none");
    map.getSource("isoSource").setData(emptyGeojson);
    map.getSource("isoPtSource").setData(emptyGeojson);
    i.currentTarget.className = "headerButton";
    condition.iso = false;
    //i.currentTarget.style.color = "#757575";
  }
}

var isoButton = document.querySelector("#iso");

isoButton.addEventListener("click", function (i) {
  toggleIso(i);
});
/////////////////////////////////////////////////////////////////
/////////////////////////////
function convertTimestamp(timestamp) {
  var int = parseInt(timestamp);
  var d = new Date(int);
  var timeStampCon = d.getDate() + "/" + d.getMonth() + "/" + d.getFullYear();
  return timeStampCon;
}
/////////////////////////////////
function filterPpt(event) {
  var objProps = JSON.parse(event.target.getAttribute("data"));
  popup.remove();
  drawPopup(objProps);
}
function hoverFilterPpt(event) {
  var objProps = JSON.parse(event.target.getAttribute("data"));
  var featureId = objProps.OBJECTID;
  map.setFilter("temp-PPT", ["in", "OBJECTID", featureId]);
}
function getArrayDepth(value) {
  return Array.isArray(value) ? 1 + Math.max(...value.map(getArrayDepth)) : 0;
}

function addPpt(e) {
  var id = e.currentTarget.getAttribute("data");

  var currPpt = map.querySourceFeatures("⚙ ППТ_source", {
    sourceLayer: "PPT-0r9jki",
    filter: ["in", "OBJECTID", parseInt(id)]
  });
  var level = getArrayDepth(currPpt[0].geometry.coordinates);
  if (level === 3) {
    var geo = turf.polygon(currPpt[0].geometry.coordinates);
    for (var o = 1; o < currPpt.length; o++) {
      var geo1 = geo;
      var geo2 = turf.polygon(currPpt[o].geometry.coordinates);
      geo = turf.union(geo1, geo2);
    }
    ///////////////////////////////////////////////////////
    var currPptFeature = {
      type: "Polygon",
      coordinates: geo.geometry.coordinates
    };

    draw.add(currPptFeature);
  } else {
    alert("Нужно отдалиться, сорян");
  }
}
/////////////////////////////////
function drawPopup(object) {
  var razr = "";
  var utv = "";
  var isp = "";
  if (object.DATA_DOC_RAZR) {
    razr =
      "<small>Дата начала разработки: " +
      convertTimestamp(object.DATA_DOC_RAZR) +
      "</small></br>";
  }
  if (object.DATA_DOC_UTV) {
    utv =
      "<small>Дата утверждения: " +
      convertTimestamp(object.DATA_DOC_UTV) +
      "</small></br>";
  }
  if (object.ISPOLNITEL) {
    isp = "<small>Исполнитель: " + object.ISPOLNITEL + "</small>";
  }
  var addPptButton =
    "<button class='addPpt' id='addPpt' data='" +
    object.OBJECTID +
    "'>Добавить на карту</button>";
  popup
    .setLngLat(clickLatLon)
    .setHTML(
      "<h4>" +
        object.NAME +
        "</h4>" +
        "<small>Статус: " +
        object.STATUS +
        "</small></br>" +
        "<small>Вид ППТ: " +
        object.VID_PPT +
        "</small></br>" +
        razr +
        utv +
        isp +
        addPptButton
    )
    .addTo(map);
  var featureId = object.OBJECTID;
  map.setFilter("temp-PPT", ["in", "OBJECTID", featureId]);
  document.getElementById("addPpt").addEventListener("click", function (event) {
    addPpt(event);
  });
}
///////////////////////////////////////////////////////////////

var popup = new mapboxgl.Popup();
var pptNames = [];
var clickLatLon;
map.on("click", "ППТ", function (e) {
  pptNames = [];
  clickLatLon = e.lngLat;
  if (e.features.length > 1) {
    for (var i = 0; i < e.features.length; i++) {
      pptNames.push(
        "<button data='" +
          JSON.stringify(e.features[i].properties) +
          "' class='pptButton'>ППТ " +
          e.features[i].properties.NAME.slice(
            29,
            e.features[i].properties.NAME.length
          ) +
          "</button>"
      );
    }

    function uniq(a) {
      return a.sort().filter(function (item, pos, ary) {
        return !pos || item != ary[pos - 1];
      });
    }
    pptNames = uniq(pptNames);
    popup
      .setLngLat(clickLatLon)
      .setHTML("<div id='pptSet'>" + pptNames.join("") + "</div>")
      .addTo(map);
    var buttonSet = document.getElementsByClassName("pptButton");
    for (var a = 0; a < buttonSet.length; a++) {
      buttonSet[a].addEventListener("click", function (event) {
        filterPpt(event);
      });
      buttonSet[a].addEventListener("mouseover", function (event) {
        hoverFilterPpt(event);
      });
    }
  } else {
    drawPopup(e.features[0].properties);
  }
});
map.on("mouseenter", "ППТ", function () {
  map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "ППТ", function () {
  map.getCanvas().style.cursor = "";
});

popup.on("close", function (e) {
  map.setFilter("temp-PPT", ["in", "OBJECTID", ""]);
});

var clearButton = document.querySelector("#clear");

clearButton.addEventListener("click", function () {
  let likeForReal = confirm("Очистить все?");
  if (likeForReal) {
    for (var i = 0; i < routesList.length; i++) {
      map.removeLayer(routesList[i]);
      map.removeLayer(routesList[i] + "-text");
      map.removeLayer(routesList[i] + "-outline");
    }
    for (i = 0; i < routesList.length; i++) {
      routesList.splice(routesList[i], 1);
    }

    routesList = [];
    colorCounter = 0;
    geojson = null;
    geojsonUNITED = null;
    PPTLIST = [""];
    map.getSource("isoSource").setData(emptyGeojson);
    map.getSource("isoSourceUNITED").setData(emptyGeojson);
    map.setLayoutProperty("iso", "visibility", "none");
    map.getSource("isoSource").setData(emptyGeojson);
    map.getSource("isoPtSource").setData(emptyGeojson);
    //
    ngptCount.textContent = routesList.length;
    ngptDOM.style.display = "none";

    var allLayers = map.getStyle().layers;
    for (i = 0; i < allLayers.length; i++) {
      if (allLayers[i].id.match(/PPT-WIP-temp-/)) {
        map.removeLayer(allLayers[i].id);
      }
    }
    map.setFilter("ППТ", [
      "all",
      ["match", ["get", "STATUS"], PPTLIST, true, false]
    ]);
    map.setFilter("ППТ_line", [
      "all",
      ["match", ["get", "STATUS"], PPTLIST, true, false]
    ]);

    isoButton.className = "headerButton";
    if (map.getSource("udsSource")) {
      map.setLayoutProperty("uds", "visibility", "none");
      map.setFilter("uds-selected", ["in", "ID", "null"]);
    }

    document.querySelectorAll(".mapboxgl-popup").forEach((e) => e.remove());
    /*var popupArray = document.getElementsByClassName("mapboxgl-popup");
    if (popupArray.length > 0) {
      console.log(popupArray);
      popupArray.forEach((pop) => {
        pop.remove();
      });
    }*/
    draw.deleteAll();
    geojsonArrow.features = [];
    map.getSource("arrowSource").setData(geojsonArrow);

    pathPolyData.features = [];
    pathPolyShadowData.features = [];
    pathPolyShadowDataMerged.features = [];
    map.getSource("pathPolySource").setData(pathPolyData);
    map.getSource("pathPolyShadowSource").setData(pathPolyShadowDataMerged);
    if (document.getElementById("drawingLayers")) {
      document.getElementById("drawingLayers").remove();
    }

    if (map.getLayer("customGLTF")) {
      map.removeLayer("customGLTF");
    }
    /*grounded = false;
    customLayer = undefined;
    url = undefined;
    jsonRersponse = undefined;*/
    document.getElementById("ППТ-old").className = "tasks__subitem";
    document.getElementById("ППТ-new").className = "tasks__subitem";
    map.getCanvas().style.cursor = "";
    //
    bldPolyData.features = [];
    shadowPolyData.features = [];
    map.getSource("bldPolySource").setData(bldPolyData);
    map.getSource("shadowBldSource").setData(shadowPolyData);
  }
});

////////////////////////////////////////////////////////////dragNdrop
let dropArea = document.querySelector("#map");
let dropDOM = document.querySelector("#drop");

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

dropArea.addEventListener("dragenter", function (event) {
  dropDOM.style.display = "flex";
  dropDOM.style.opacity = "0.6";
  this.style.filter = "blur(2px)";
});

dropArea.addEventListener("dragleave", function (event) {
  dropDOM.style.opacity = "0";
  this.style.filter = "";
});

dropArea.addEventListener("drop", function (event) {
  if (event.dataTransfer) {
    dropDOM.style.opacity = "0";
    this.style.filter = "";
    clearButton.style.display = "block";
    var file = event.dataTransfer.files[0];
    let reader = new FileReader();
    fileName = file.name.split(".");
    extension = fileName.pop().toLowerCase(); //file extension from input file

    if (fileTypes.indexOf(extension) < 4 && fileTypes.indexOf(extension) > -1) {
      var currentCanvas = document.getElementById("canvasID");
      if (currentCanvas) {
        currentCanvas.remove();
      }
      if (map.getLayer("canvas-layer")) {
        map.removeLayer("canvas-layer");
        map.removeSource("canvas-source");
      }
      reader.readAsDataURL(file);
      reader.onload = function () {
        var dataURL = reader.result;
        pic = new Image();
        pic.crossOrigin = "anonymous";
        pic.src = dataURL;
        pic.onload = drawImageActualSize;
        picProps = {
          clipping: false,
          drawStart: false,
          pts: [],
          finalImage: false,
          scale: 1
        };
        picRect = null;
        polyReset = null;
        angle = 0;
        resetAngle = null;
        ratio = 1;
        bearing = null;
        helperPoints = {};

        var canvasDOM = document.createElement("div");
        canvasDOM.id = "canvasDOM";
        document.body.appendChild(canvasDOM);

        var buttonCanvasDOM = document.createElement("div");
        buttonCanvasDOM.id = "buttonCanvasDOM";
        canvasDOM.appendChild(buttonCanvasDOM);

        ///listeners

        const crosshairCursor = function (e) {
          canvasTemp.style.cursor = "crosshair";
        };
        const defaultCursor = function (e) {
          canvasTemp.style.cursor = "auto";
        };
        const btnClip = document.createElement("button");
        btnClip.id = "clip";
        btnClip.className = "canvasBtn";
        btnClip.innerHTML = "Обрезать";
        btnClip.onclick = () => {
          if (picProps.clipping == false) {
            picProps.clipping = true;
            btnClip.innerHTML = "Отменить";
            btnClip.classList.add(`selected`);
            canvasTemp.addEventListener("mouseover", crosshairCursor);
            canvasTemp.addEventListener("mouseout", defaultCursor);
            tipCanvas.innerHTML =
              "Колесико для увеличения</br>ПКМ - отмена последней точки</br>Двойной клик - завершение полигона";
          } else {
            btnClip.classList.remove(`selected`);
            btnClip.innerHTML = "Обрезать";
            picProps.clipping = false;
            picProps.finalImage = false;
            canvasTemp.removeEventListener("mouseover", crosshairCursor);
            canvasTemp.removeEventListener("mouseout", defaultCursor);
            ctx.restore();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(pic, 0, 0, canvas.width, canvas.height);
            tipCanvas.innerHTML = "Колесико для увеличения";
            picProps.drawStart = false;
            picProps.pts = [];
            ctxTemp.clearRect(0, 0, canvas.width, canvas.height);
          }
        };
        buttonCanvasDOM.appendChild(btnClip);

        function canvasOnMap() {
          var coordsBbox;
          console.log(picRect);
          if (!picRect) {
            var aspectImg = picProps.picWidth / picProps.picHeight;
            var aspectMap = dropArea.clientWidth / dropArea.clientHeight;
            var finAspect = aspectImg / aspectMap;
            var bounds = map.getBounds();
            var widthMap = bounds._ne.lng - bounds._sw.lng;

            var newWidth = widthMap * finAspect;
            bounds._ne.lng = bounds._ne.lng - (widthMap - newWidth) / 2;
            bounds._sw.lng = bounds._sw.lng + (widthMap - newWidth) / 2;
            coordsBbox = [
              [bounds._sw.lng, bounds._ne.lat],
              [bounds._ne.lng, bounds._ne.lat],
              [bounds._ne.lng, bounds._sw.lat],
              [bounds._sw.lng, bounds._sw.lat]
            ];
            data.features[0] = turf.polygon([
              [
                coordsBbox[0],
                coordsBbox[3],
                coordsBbox[2],
                coordsBbox[1],
                coordsBbox[0]
              ]
            ]);
            picRect = JSON.parse(JSON.stringify(data));
            bboxRect = JSON.parse(JSON.stringify(data));
          } else {
            var geo = data.features[0].geometry.coordinates[0];
            coordsBbox = [geo[0], geo[3], geo[2], geo[1]];
            map.fitBounds([geo[2], geo[3]], {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              maxZoom: 15
            });
          }

          map.getSource("rectS").setData(bboxRect);
          map.getSource("rectS2").setData(picRect);
          map.setLayoutProperty("rect", "visibility", "visible");
          map.addSource("canvas-source", {
            type: "canvas",
            canvas: "canvasID",
            coordinates: coordsBbox
          });

          map.addLayer(
            {
              id: "canvas-layer",
              type: "raster",
              source: "canvas-source",
              paint: {
                "raster-opacity": 0.75
              }
            },
            "tram-stroke"
          );
          picProps.initialX = canvas.width;
          picProps.initialY = canvas.height;
          picProps.coords = map.getSource("canvas-source").coordinates;

          picProps.lineX = turf.lineString([
            picProps.coords[0],
            picProps.coords[1]
          ]);
          picProps.lineY = turf.lineString([
            picProps.coords[1],
            picProps.coords[2]
          ]);
          picProps.lengthX = turf.length(picProps.lineX, { units: "meters" });
          picProps.lengthY = turf.length(picProps.lineY, { units: "meters" });

          ////////////////////////////////////////////////////////////////////////
          imageGeorefDOM.style.display = "block";
          maskTabDOM.style.display = "block";
          toggleGeoreference();
          map.getCanvas().style.cursor = "move";
          ////////////////////////////////////////////////////TO LAYERSTACK
          var DOMoverlay = document.createElement("li");
          DOMoverlay.className = "tasks__item selected";
          DOMoverlay.setAttribute("data", "canvas-layer");
          DOMoverlay.id = "overlayId";
          DOMoverlay.draggable = "true";

          DOMoverlay.addEventListener("click", (e) => {
            panelToggleTaskItem(e);
          });
          DOMoverlay.addEventListener(`dragstart`, (evt) => {
            evt.target.classList.add(`hovered`);
          });

          DOMoverlay.addEventListener(`dragend`, (evt) => {
            evt.target.classList.remove(`hovered`);
          });

          DOMoverlay.addEventListener(`dragover`, (evt) => {
            dragoverLayerstack(evt);
          });

          var miniPic = document.createElement("div");
          miniPic.innerHTML = '<i class="fas fa-image"></i>';
          miniPic.style.fontSize = "20px";
          miniPic.style.display = "flex";
          miniPic.style.justifyContent = "center";
          miniPic.style.alignItems = "center";

          miniPic.className = "layerIllustration";
          //

          DOMoverlay.appendChild(miniPic);

          DOMoverlay.innerHTML += "Пользовательское<br>изображение";

          document.querySelector(".tasks__list").appendChild(DOMoverlay);
        }
        const btnSave = document.createElement("button");
        btnSave.id = "saveCanvas";
        btnSave.className = "canvasBtn";
        btnSave.innerHTML = "Сохранить";
        btnSave.onclick = () => {
          btnSave.classList.add(`selected`);
          let okImage = confirm("Берем картинку?");
          if (okImage) {
            picProps.clipping = false;
            picProps.finalImage = true;
            picProps.drawStart = false;
            picProps.scale = 1;
            picProps.pts = [];
            pic.src = canvas.toDataURL();
            pic.onload = canvasOnMap();
            canvasDOM.style.display = "none";
          }
        };
        buttonCanvasDOM.appendChild(btnSave);

        //const file
        var worldButton = document.createElement("input");
        worldButton.type = "file";
        worldButton.className = "canvasBtn";
        worldButton.style.opacity = 0;
        worldButton.style.maxWidth = "140px";
        worldButton.id = "worldButton";
        worldButton.accept = ".wld, .pgw, .jgw";
        worldButton.addEventListener("input", function () {
          if (worldButton.files.length > 0) {
            var file = worldButton.files[0];

            let reader = new FileReader();

            reader.readAsText(file);

            reader.onload = function () {
              var lines = reader.result.split(/\n/);
              if (lines.length == 6) {
                worldLabel.innerHTML = file.name;
                var initialX = parseFloat(lines[4]);
                var initialY = parseFloat(lines[5]);

                var resolutionX = parseFloat(lines[0]);
                var deltaX = ctx.canvas.width * resolutionX;

                var resolutionY = -parseFloat(lines[3]);
                var deltaY = ctx.canvas.height * resolutionY;

                var coordsBbox = [
                  turf.toWgs84(turf.point([initialX, initialY])).geometry
                    .coordinates,
                  turf.toWgs84(turf.point([initialX + deltaX, initialY]))
                    .geometry.coordinates,
                  turf.toWgs84(
                    turf.point([initialX + deltaX, initialY - deltaY])
                  ).geometry.coordinates,
                  turf.toWgs84(turf.point([initialX, initialY - deltaY]))
                    .geometry.coordinates
                ];
                data.features[0] = turf.polygon([
                  [
                    coordsBbox[0],
                    coordsBbox[3],
                    coordsBbox[2],
                    coordsBbox[1],
                    coordsBbox[0]
                  ]
                ]);
                picRect = JSON.parse(JSON.stringify(data));
                bboxRect = JSON.parse(JSON.stringify(data));
              }
            };

            reader.onerror = function () {
              console.log(reader.error);
            };
          } else {
            worldLabel.innerHTML = ".WLD файл";
            picRect = undefined;
          }
        });
        buttonCanvasDOM.appendChild(worldButton);

        const worldLabel = document.createElement("label");
        worldLabel.for = "worldButton";
        worldLabel.className = "canvasBtn";
        worldLabel.innerHTML = ".WLD файл";
        worldLabel.id = "worldLabel";
        buttonCanvasDOM.appendChild(worldLabel);

        const btnClose = document.createElement("button");
        btnClose.id = "closeCanvas";
        btnClose.className = "canvasBtn";
        btnClose.innerHTML = "Удалить";
        btnClose.style.color = "#ad1a1e";
        btnClose.onclick = () => {
          btnClose.classList.add(`selected`);
          let okImage = confirm("Убираем картинку?");
          if (okImage) {
            picProps = {
              clipping: false,
              drawStart: false,
              pts: [],
              finalImage: false,
              scale: 1,
              aspect: 1
            };
            canvas = null;
            pic = null;
            ctx = null;
            canvasDOM.style.display = "none";
            picRect = null;
          }
        };
        buttonCanvasDOM.appendChild(btnClose);

        const tipCanvas = document.createElement("div");
        tipCanvas.id = "tipCanvas";
        tipCanvas.className = "canvasBtn";
        tipCanvas.innerHTML = "Колесико чтобы увеличить";
        buttonCanvasDOM.appendChild(tipCanvas);

        document.addEventListener("keydown", function (event) {
          if (event.ctrlKey && event.key === "z") {
            console.log("BACK");
            if (picProps.pts) {
              picProps.pts.pop();
            }
          }
        });

        function canvasZoom(event) {
          event.preventDefault();
          var currentScale = picProps.scale - event.deltaY / 1000;

          var pos = [
            event.offsetX - canvas.clientWidth / 2,
            event.offsetY - canvas.clientHeight / 2
          ];
          if (currentScale <= 4 && currentScale >= 1) {
            picProps.scale = currentScale;
            if (currentScale == 1) {
              pos = [0, 0];
            }
            canvas.style.transform = `scale(${picProps.scale}) translate(${
              -pos[0] / 2
            }px,${-pos[1] / 2}px)`;
            canvasTemp.style.transform = `scale(${picProps.scale}) translate(${
              -pos[0] / 2
            }px,${-pos[1] / 2}px)`;
          }
        }

        canvasDOM.addEventListener(
          "wheel",
          (e) => {
            canvasZoom(e);
          },
          { passive: false }
        );

        function drawImageActualSize() {
          if (picProps.finalImage == false) {
            canvas = document.createElement("canvas");
            canvas.id = "canvasID";
            ctx = canvas.getContext("2d");
            picProps.picWidth = pic.naturalWidth;
            picProps.picHeight = pic.naturalHeight;
            if (
              picProps.picWidth > maxPicSize ||
              picProps.picHeight > maxPicSize
            ) {
              if (picProps.picWidth > picProps.picHeight) {
                picProps.picHeight =
                  (picProps.picHeight * maxPicSize) / picProps.picWidth;
                picProps.picWidth = maxPicSize;
              } else {
                picProps.picWidth =
                  (picProps.picWidth * maxPicSize) / picProps.picHeight;
                picProps.picHeight = maxPicSize;
              }
            }
            if (picProps.picWidth > picProps.picHeight) {
              picProps.mult = Math.max(
                1,
                Math.ceil(picProps.picWidth / 1000) - 1
              );
            } else {
              picProps.mult = Math.max(
                1,
                Math.ceil(picProps.picHeight / 1000) - 1
              );
            }

            canvas.width = picProps.picWidth; //pic.naturalWidth;
            canvas.height = picProps.picHeight; //pic.naturalHeight;
            var width =
              window.innerWidth ||
              document.documentElement.clientWidth ||
              document.body.clientWidth;
            var height =
              window.innerHeight ||
              document.documentElement.clientHeight ||
              document.body.clientHeight;
            var windowAspect = width / height;
            var pictureAspect = this.naturalWidth / this.naturalHeight;
            canvasTemp = document.createElement("canvas");
            canvasTemp.id = "canvasIdTemp";
            canvasTemp.style =
              "position:absolute; transition: transform 300ms;";
            ctxTemp = canvasTemp.getContext("2d");
            canvasTemp.width = picProps.picWidth / picProps.mult; //pic.naturalWidth;
            canvasTemp.height = picProps.picHeight / picProps.mult;

            if (windowAspect > pictureAspect) {
              console.log("Экран шире картинки, ограничение - высота");
              canvasDOM.style.width = width - 26 + "px";
              canvasDOM.style.height = height - 132 + "px";
              canvas.style.height = "100%";
              canvasTemp.style.height = "100%";
              picProps.aspect =
                /*this.naturalHeight*/ picProps.picHeight /
                canvasDOM.getBoundingClientRect().height;
            } else {
              console.log("Картинка шире экрана, ограничение - ширина");
              canvasDOM.style.width = width - 26 + "px";
              canvasDOM.style.height = height - 132 + "px";
              canvas.style.width = "100%";
              canvasTemp.style.width = "100%";
              picProps.aspect =
                /*this.naturalWidth*/ picProps.picWidth /
                canvasDOM.getBoundingClientRect().width;
            }

            ctx.drawImage(this, 0, 0, canvas.width, canvas.height);

            canvasTemp.addEventListener("mousemove", (e) => {
              if (picProps.drawStart == true && picProps.pts.length > 0) {
                /*ctxTemp.putImageData(picProps.imageData, 0, 0);*/
                ctxTemp.clearRect(0, 0, canvasTemp.width, canvasTemp.height);
                ctxTemp.moveTo(picProps.pts[0][0], picProps.pts[0][1]);
                ctxTemp.strokeStyle = "hsla(213, 98%, 38%, 0.7)";
                ctxTemp.lineWidth = 4;
                ctxTemp.beginPath();
                picProps.pts.forEach((pt) => {
                  ctxTemp.lineTo(pt[0], pt[1]);
                });
                ctxTemp.moveTo(
                  picProps.pts[picProps.pts.length - 1][0],
                  picProps.pts[picProps.pts.length - 1][1]
                );
                var x = (e.offsetX * picProps.aspect) / picProps.mult;
                var y = (e.offsetY * picProps.aspect) / picProps.mult;
                ctxTemp.lineTo(x, y);
                ctxTemp.closePath();
                ctxTemp.stroke();
              }
            });

            canvasTemp.addEventListener("click", (e) => {
              if (picProps.finalImage == false && picProps.clipping == true) {
                if (!picProps.drawStart == true) {
                  picProps.drawStart = true;
                }
                var x = (e.offsetX * picProps.aspect) / picProps.mult;
                var y = (e.offsetY * picProps.aspect) / picProps.mult;
                picProps.pts.push([x, y]);
              }
            });
            function finishDrawing() {
              ctxTemp.clearRect(0, 0, canvasTemp.width, canvasTemp.height);
              ctx.save();

              ctx.fillStyle = "red";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = "blue";
              ctx.beginPath();
              picProps.pts.forEach((pt) => {
                ctx.lineTo(pt[0] * picProps.mult, pt[1] * picProps.mult);
              });
              ctx.closePath();
              ctx.fill();
              picProps.pts = [];
              //
              var idata = ctx.getImageData(0, 0, canvas.width, canvas.height);
              var data32 = new Uint32Array(idata.data.buffer);
              var c = 0,
                len = data32.length;
              while (c < len) {
                data32[c] = data32[c++] << 8; // shift blue channel into alpha (little-endian)
              }
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.putImageData(idata, 0, 0);
              ctx.globalCompositeOperation = "source-in";
              ctx.drawImage(pic, 0, 0, canvas.width, canvas.height);
              ctx.globalCompositeOperation = "destination-over";
            }

            canvasTemp.addEventListener("contextmenu", (e) => {
              e.preventDefault();
              if (picProps.finalImage == false && picProps.pts.length > 1) {
                //finishDrawing();
                picProps.pts.pop();
                ////
                ctxTemp.clearRect(0, 0, canvasTemp.width, canvasTemp.height);
                ctxTemp.moveTo(picProps.pts[0][0], picProps.pts[0][1]);
                ctxTemp.strokeStyle = "hsla(213, 98%, 38%, 0.7)";
                ctxTemp.lineWidth = 4;
                ctxTemp.beginPath();
                picProps.pts.forEach((pt) => {
                  ctxTemp.lineTo(pt[0], pt[1]);
                });
                ctxTemp.moveTo(
                  picProps.pts[picProps.pts.length - 1][0],
                  picProps.pts[picProps.pts.length - 1][1]
                );
                var x = (e.offsetX * picProps.aspect) / picProps.mult;
                var y = (e.offsetY * picProps.aspect) / picProps.mult;
                ctxTemp.lineTo(x, y);
                ctxTemp.stroke();
              } else if (
                picProps.finalImage == false &&
                picProps.pts.length == 1
              ) {
                //btnClip.classList.remove(`selected`);
                //picProps.finalImage = true;
                picProps.drawStart = false;
                picProps.pts = [];
                ctxTemp.clearRect(0, 0, canvasTemp.width, canvasTemp.height);
                //ctx.restore();
                //ctx.clearRect(0, 0, canvas.width, canvas.height);
                //ctx.drawImage(pic, 0, 0, canvas.width, canvas.height);
              }
            });
            canvasTemp.addEventListener("dblclick", (e) => {
              e.preventDefault();
              if (picProps.finalImage == false) {
                finishDrawing();
                tipCanvas.innerHTML = "Колесико для увеличения";
                btnClip.innerHTML = "Восстановить";
              }
            });
            canvasDOM.appendChild(canvas);
            canvasDOM.appendChild(canvasTemp);
            //////COLOR PICKER
            /*
          var dynamicCircle = document.createElement("div");
          dynamicCircle.id = "dynamicCircle";
          dynamicCircle.style =
            "position:absolute; transform:translate(-50%,-50%); height:10px; width:10px; border-radius:50%; border:2px solid white; z-index:10000; pointer-events:none";
          document.body.appendChild(dynamicCircle);
          var selPxColor = [];
          var colorSpread = 20;
          canvasDOM.addEventListener("mousemove", (e) => {
            var x = e.offsetX * picProps.aspect;
            var y = e.offsetY * picProps.aspect;
            var pixelData = ctx.getImageData(x, y, 1, 1).data;
            // selPxColor = [pixelData[0], pixelData[1], pixelData[2]];
            selPxColor = [
              parseInt(pixelData[0] / colorSpread),

              parseInt(pixelData[1] / colorSpread),

              parseInt(pixelData[2] / colorSpread)
            ];
            let left = e.pageX;
            let top = e.pageY;
            dynamicCircle.style.left = left + "px";
            dynamicCircle.style.top = top + "px";
            dynamicCircle.style.background =
              "rgb(" +
              pixelData[0] +
              "," +
              pixelData[1] +
              "," +
              pixelData[2] +
              ")";
            /////////////////////////////////////////////
          });
          canvasDOM.addEventListener("click", (e) => {
            if (ctx) {
              var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              for (var i = 0; i < imgData.data.length; i += 4) {
                var currColor = [
                  parseInt(imgData.data[i] / colorSpread),
                  parseInt(imgData.data[i + 1] / colorSpread),
                  parseInt(imgData.data[i + 2] / colorSpread)
                ];
                if (currColor.toString() == selPxColor.toString()) {
                  imgData.data[i] = 50;
                  imgData.data[i + 1] = 50;
                  imgData.data[i + 2] = 255;
                  imgData.data[i + 3] = 120;
                } else {
                  imgData.data[i + 3] = 0;
                }
              }
            }
            ctxTemp.clearRect(0, 0, canvasTemp.width, canvasTemp.height);
            ctxTemp.putImageData(
              imgData,
              0,
              0,
              0,
              0,
              canvasTemp.width,
              canvasTemp.height
            );
          });
          */
          }
        }
      };
    } else if (
      fileTypes.indexOf(extension) > 3 &&
      fileTypes.indexOf(extension) > -1
    ) {
      reader.readAsText(file);
      reader.onloadend = function () {
        let geojsonData = JSON.parse(reader.result);
        if (geojsonData.bbox) {
          map.fitBounds(geojsonData.bbox, {
            padding: { top: 200, bottom: 200, left: 200, right: 200 }
          });
        } else {
          var bbox = turf.bbox(geojsonData.features[0]);
          var bboxLatLng = [
            [bbox[0], bbox[3]],
            [bbox[2], bbox[1]]
          ];
          map.fitBounds(bboxLatLng, {
            padding: { top: 200, bottom: 200, left: 200, right: 200 }
          });
        }
        for (var i = 0; i < geojsonData.features.length; i++) {
          let type = geojsonData.features[i].geometry.type;
          if (type == "Polygon") {
            let id = geojsonData.features[i].id;
            if (!id) {
              id = [...crypto.getRandomValues(new Uint8Array(20))]
                .map((m) => ("0" + m.toString(16)).slice(-2))
                .join("");
            }
            var feature = {
              id: id,
              type: "Feature",
              properties: geojsonData.features[i].properties,
              geometry: {
                type: "Polygon",
                coordinates: geojsonData.features[i].geometry.coordinates
              }
            };
            if (!feature.properties.color) {
              feature.properties.color = colorDraw;
            }
            if (!feature.properties.opacity) {
              feature.properties.opacity = drawOpacity;
            }

            if (!feature.properties.width) {
              feature.properties.width = widthDraw;
            }

            if (!feature.properties.dash) {
              feature.properties.dash = dashes[dashDraw];
            }
            draw.add(feature);
            if (feature.properties.height) {
              feature.properties.id = id;
              cleanBlds(id);
              //var bld = createExtrusion(feature);
              draw.setFeatureProperty(id, "height", feature.properties.height);
              //draw.setFeatureProperty(id, "width", 0);
              bldPolyData.features.push(feature);
              //shadowPolyData.features.push(makeShadow(feature));
              map.getSource("bldPolySource").setData(bldPolyData);
              //map.getSource("shadowBldSource").setData(shadowPolyData);
            }
          } else if (type == "MultiPolygon") {
            for (
              var e = 0;
              e < geojsonData.features[i].geometry.coordinates.length;
              e++
            ) {
              let id = [...crypto.getRandomValues(new Uint8Array(20))]
                .map((m) => ("0" + m.toString(16)).slice(-2))
                .join("");

              var feature = {
                id: id,
                type: "Feature",
                properties: geojsonData.features[i].properties,
                geometry: {
                  type: "Polygon",
                  coordinates: geojsonData.features[i].geometry.coordinates[e]
                }
              };
              if (!feature.properties.color) {
                feature.properties.color = colorDraw;
              }
              if (!feature.properties.opacity) {
                feature.properties.opacity = drawOpacity;
              }

              if (!feature.properties.width) {
                feature.properties.width = widthDraw;
              }

              if (!feature.properties.dash) {
                feature.properties.dash = dashes[dashDraw];
              }
              draw.add(feature);
            }
          } else if (type == "MultiLineString") {
            for (
              var e = 0;
              e < geojsonData.features[i].geometry.coordinates.length;
              e++
            ) {
              let id = [...crypto.getRandomValues(new Uint8Array(20))]
                .map((m) => ("0" + m.toString(16)).slice(-2))
                .join("");

              let correctType;
              let correctCoords;
              let firstPt = geojsonData.features[i].geometry.coordinates[e][0];
              let lastPt =
                geojsonData.features[i].geometry.coordinates[e][
                  geojsonData.features[i].geometry.coordinates[e].length - 1
                ];
              if (firstPt[0] == lastPt[0] && firstPt[1] == lastPt[1]) {
                correctType = "Polygon";
                correctCoords = [
                  geojsonData.features[i].geometry.coordinates[e]
                ];
              } else {
                correctType = "LineString";
                correctCoords = geojsonData.features[i].geometry.coordinates[e];
              }

              var feature = {
                id: id,
                type: "Feature",
                properties: geojsonData.features[i].properties,
                geometry: {
                  type: correctType,
                  coordinates: correctCoords
                }
              };
              if (!feature.properties.color) {
                feature.properties.color = colorDraw;
              }
              if (!feature.properties.opacity) {
                feature.properties.opacity = drawOpacity;
              }

              if (!feature.properties.width) {
                feature.properties.width = widthDraw;
              }

              if (!feature.properties.dash) {
                feature.properties.dash = dashes[dashDraw];
              }
              draw.add(feature);
              createArrow(feature);
            }
          } else if (
            type == "LineString" &&
            geojsonData.features[i].properties.bridge !== true
          ) {
            let id = [...crypto.getRandomValues(new Uint8Array(20))]
              .map((m) => ("0" + m.toString(16)).slice(-2))
              .join("");

            let correctType;
            let correctCoords;
            let firstPt = geojsonData.features[i].geometry.coordinates[0];
            let lastPt =
              geojsonData.features[i].geometry.coordinates[
                geojsonData.features[i].geometry.coordinates.length - 1
              ];
            if (firstPt[0] == lastPt[0] && firstPt[1] == lastPt[1]) {
              correctType = "Polygon";
              correctCoords = [geojsonData.features[i].geometry.coordinates];
            } else {
              correctType = "LineString";
              correctCoords = geojsonData.features[i].geometry.coordinates;
            }

            var feature = {
              id: id,
              type: "Feature",
              properties: geojsonData.features[i].properties,
              geometry: {
                type: correctType,
                coordinates: correctCoords
              }
            };
            if (!feature.properties.color) {
              feature.properties.color = colorDraw;
            }
            if (!feature.properties.opacity) {
              feature.properties.opacity = drawOpacity;
            }

            if (!feature.properties.width) {
              feature.properties.width = widthDraw;
            }

            if (!feature.properties.dash) {
              feature.properties.dash = dashes[dashDraw];
            }
            draw.add(feature);
            createArrow(feature);
          } else if (
            type == "LineString" &&
            geojsonData.features[i].properties.bridge == true
          ) {
            condition.bridgeWidth =
              geojsonData.features[i].properties.widthBridge;
            if (geojsonData.features[i].properties.radiusBridge) {
              condition.bridgeMaxRadius =
                geojsonData.features[i].properties.radiusBridge;
            }
            condition.bridgeStepSize =
              geojsonData.features[i].properties.widthBridge / 2 + 1;
            condition.bridgeType =
              geojsonData.features[i].properties.bridgeType;
            condition.bridgeHeight =
              geojsonData.features[i].properties.bridgeHeight;
            colorDraw = geojsonData.features[i].properties.color;
            draw.add(geojsonData.features[i]);
            createBridge(geojsonData.features[i]);
            condition.bridge = false;
          } else if (
            type == "LineString" &&
            geojsonData.features[i].properties.road == true
          ) {
            condition.bridgeWidth =
              geojsonData.features[i].properties.widthBridge;
            if (geojsonData.features[i].properties.radiusBridge) {
              condition.bridgeMaxRadius =
                geojsonData.features[i].properties.radiusBridge;
            }

            colorDraw = geojsonData.features[i].properties.color;
            createRoad(geojsonData.features[i]);
            condition.road = false;
          } else if (type == "Point") {
            let id = [...crypto.getRandomValues(new Uint8Array(20))]
              .map((m) => ("0" + m.toString(16)).slice(-2))
              .join("");

            var feature = {
              id: id,
              type: "Feature",
              properties: geojsonData.features[i].properties,
              geometry: {
                type: "Point",
                coordinates: geojsonData.features[i].geometry.coordinates
              }
            };
            if (!feature.properties.color) {
              feature.properties.color = colorDraw;
            }
            draw.add(feature);
          }
          ////////////////////////////TO LAYERSTACK
          if (!document.getElementById("drawingLayers")) {
            var DOMdrawing = document.createElement("li");
            DOMdrawing.className = "tasks__item selected";
            DOMdrawing.setAttribute(
              "data",
              "gl-draw-polygon-fill-inactive.cold,gl-draw-polygon-fill-active.cold,gl-draw-polygon-midpoint.cold,gl-draw-polygon-stroke-inactive.cold,gl-draw-polygon-stroke-active.cold,gl-draw-line-inactive.cold,gl-draw-line-active.cold,gl-draw-polygon-and-line-vertex-stroke-inactive.cold,gl-draw-polygon-and-line-vertex-inactive.cold,gl-draw-point-point-stroke-inactive.cold,gl-draw-point-inactive.cold,gl-draw-point-stroke-active.cold,gl-draw-point-active.cold,gl-draw-polygon-fill-static.cold,gl-draw-polygon-stroke-static.cold,gl-draw-line-static.cold,gl-draw-point-static.cold,gl-draw-polygon-fill-inactive.hot,gl-draw-polygon-fill-active.hot,gl-draw-polygon-midpoint.hot,gl-draw-polygon-stroke-inactive.hot,gl-draw-polygon-stroke-active.hot,gl-draw-line-inactive.hot,gl-draw-line-active.hot,gl-draw-polygon-and-line-vertex-stroke-inactive.hot,gl-draw-polygon-and-line-vertex-inactive.hot,gl-draw-point-point-stroke-inactive.hot,gl-draw-point-inactive.hot,gl-draw-point-stroke-active.hot,gl-draw-point-active.hot,gl-draw-polygon-fill-static.hot,gl-draw-polygon-stroke-static.hot,gl-draw-line-static.hot,gl-draw-point-static.hot"
            );
            DOMdrawing.id = "drawingLayers";
            DOMdrawing.draggable = "true";

            DOMdrawing.addEventListener("click", (e) => {
              panelToggleTaskItem(e);
            });
            DOMdrawing.addEventListener(`dragstart`, (evt) => {
              evt.target.classList.add(`hovered`);
            });

            DOMdrawing.addEventListener(`dragend`, (evt) => {
              evt.target.classList.remove(`hovered`);
            });

            DOMdrawing.addEventListener(`dragover`, (evt) => {
              dragoverLayerstack(evt);
            });

            var miniPic = document.createElement("div");
            miniPic.innerHTML = '<i class="fas fa-draw-polygon"></i>';
            miniPic.id = "drawIllustration";
            miniPic.style.fontSize = "20px";
            miniPic.style.display = "flex";
            miniPic.style.justifyContent = "center";
            miniPic.style.alignItems = "center";
            miniPic.style.background = colorDraw;
            miniPic.style.filter = "grayscale(0.5)";
            miniPic.className = "layerIllustration";

            DOMdrawing.appendChild(miniPic);

            DOMdrawing.innerHTML += "Пользовательская<br>геометрия";

            document.querySelector(".tasks__list").appendChild(DOMdrawing);
          }
        }
        ///пробовал отличать полигон от линии, но чето сложно пока
        /*
      var pt1 = geojsonData.features[0].geometry.coordinates[0];
      var pt2 =
        geojsonData.features[0].geometry.coordinates[
          geojsonData.features[0].geometry.coordinates.length - 1
        ];

      if (pt1[0] == pt2[0]) {
        console.log("замкнуто");
        for (var e = 0; e < geojsonData.features.length; e++) {
          var feature = {
            type: "Polygon",
            coordinates: geojsonData.features[e].geometry.coordinates
          };
          console.log(feature);
          draw.add(feature);
        }
        //map.getSource("userDataLine").setData(geojsonData);
        //map.getSource("userDataPoly").setData(geojsonData);
      } else {
        console.log("незамкнуто");
        for (e = 0; e < geojsonData.features.length; e++) {
          var geomFix = geojsonData.features[e].geometry.coordinates.push(
            geojsonData.features[e].geometry.coordinates[0]
          );
          var feature = {
            type: "Polygon",
            coordinates: [geomFix]
          };
          console.log(feature);
          draw.add(feature);
        }
        //map.getSource("userDataLine").setData(geojsonData);
      }
*/
        /*
      if (geojsonData.features[0].geometry.coordinates.length === 1) {
        for (var e = 0; e < geojsonData.features.length; e++) {
          var feature = {
            type: "Polygon",
            coordinates: geojsonData.features[e].geometry.coordinates
          };

          draw.add(feature);
          map.moveLayer("gl-draw-polygon-fill-inactive.cold", "waterway-label");
          map.moveLayer("gl-draw-polygon-fill-inactive.hot", "waterway-label");
          map.moveLayer(
            "gl-draw-polygon-stroke-inactive.cold",
            "waterway-label"
          );
          map.moveLayer(
            "gl-draw-polygon-stroke-inactive.hot",
            "waterway-label"
          );
        }
        //map.getSource("userDataLine").setData(geojsonData);
        //map.getSource("userDataPoly").setData(geojsonData);
      } else {
        if (geojsonData.features[0].geometry.type === "MultiLineString") {
          for (var e = 0; e < geojsonData.features.length; e++) {
            for (
              var u = 0;
              u < geojsonData.features[e].geometry.coordinates.length;
              u++
            ) {
              var feature = {
                type: "Polygon",
                coordinates: [geojsonData.features[e].geometry.coordinates[u]]
              };
              //console.log(geojsonData.features[e].geometry.coordinates.length);
              draw.add(feature);
              map.moveLayer("gl-draw-polygon-fill-inactive.cold", "poi-label");
              map.moveLayer("gl-draw-polygon-fill-inactive.hot", "poi-label");
              map.moveLayer(
                "gl-draw-polygon-stroke-inactive.cold",
                "poi-label"
              );
              map.moveLayer("gl-draw-polygon-stroke-inactive.hot", "poi-label");
            }
          }
        } else {
          for (e = 0; e < geojsonData.features.length; e++) {
            var feature = {
              type: "Polygon",
              coordinates: [geojsonData.features[e].geometry.coordinates]
            };

            draw.add(feature);
            map.moveLayer("gl-draw-polygon-fill-inactive.cold", "poi-label");
            map.moveLayer("gl-draw-polygon-fill-inactive.hot", "poi-label");
            map.moveLayer("gl-draw-polygon-stroke-inactive.cold", "poi-label");
            map.moveLayer("gl-draw-polygon-stroke-inactive.hot", "poi-label");
          }
        }
      }*/
      };
    } else {
      alert("Не понятно что за файл!");
    }
  }
});

//////////////////////////////////////////////////////////////

var lanesCondition = {
  popupDraw: false,
  coords: [],
  pixels: [],
  selectedObjects: [],
  finPopup: [],
  ngptRoutes: []
  /*roadName: null,
  state: null*/
};

var currGeojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0]
        ]
      }
    }
  ]
};

map.on("click", function (e) {
  if (condition.lanes === true) {
    if (!map.getSource("udsSource")) {
      map.addSource("udsSource", {
        type: "vector",
        url: "mapbox://yanpogutsa.graph"
      });
      map.addLayer({
        id: "uds",
        type: "line",
        source: "udsSource",
        "source-layer": "graph",
        paint: {
          "line-color": "#4FE0C8",
          "line-opacity": 0.0,
          "line-width": 2
        },
        layout: {
          visibility: "none"
        }
      });

      map.addLayer({
        id: "uds-selected",
        type: "line",
        source: "udsSource",
        "source-layer": "graph",
        paint: {
          "line-color": "#4FE0C8",
          "line-width": 8
        },
        filter: ["in", "ID", "null"]
      });
    }
    if (lanesCondition.coords.length === 0) {
      map.setLayoutProperty("uds", "visibility", "visible");
      var pt = [e.lngLat.lng, e.lngLat.lat];
      var px = [e.point.x, e.point.y];
      lanesCondition.coords.push(pt);
      lanesCondition.pixels.push(px);
      lanesCondition.state = true;
    }
    if (lanesCondition.coords.length === 2) {
      lanesCondition.state = false;
      map.setLayoutProperty("uds", "visibility", "none");
      map.setFilter("uds-selected", ["in", "ID", "null"]);
      map.getSource("drawLineS").setData(emptyGeojson);

      if (lanesCondition.selectedObjects.length) {
        var coordTurf = turf.points([
          lanesCondition.coords[0],
          lanesCondition.coords[1]
        ]);
        var centerTurf = turf.center(coordTurf);

        for (var i = 0; i < lanesCondition.selectedObjects.length; i++) {
          if (lanesCondition.selectedObjects[i].properties.F_LANES) {
            var segments = turf.lineSegment(lanesCondition.selectedObjects[i]);

            var drawnLine = turf.lineString([
              lanesCondition.coords[0],
              lanesCondition.coords[1]
            ]);

            segments.features.forEach((seg) => {
              var intersects = turf.lineIntersect(seg, drawnLine);
              if (intersects.features.length > 0) {
                var p1 = seg.geometry.coordinates[0];
                var p2 =
                  seg.geometry.coordinates[seg.geometry.coordinates.length - 1];
                var point1 = turf.point(p1);
                var point2 = turf.point(p2);
                var bearing = turf.bearing(point1, point2);
                //selectedObjects[i].properties.bearing = bearing;
                var currentProp = {
                  bearing: bearing,
                  oneway: seg.properties.ONEWAY,
                  f_lines: seg.properties.F_LANES,
                  t_lines: seg.properties.T_LANES,
                  f_buslines: seg.properties.F_BUSLANES,
                  t_buslines: seg.properties.T_BUSLANES
                };
                lanesCondition.finPopup.push(currentProp);
              }
            });

            /*var p1 = selectedObjects[i].geometry.coordinates[0];
            var p2 =
              selectedObjects[i].geometry.coordinates[
                selectedObjects[i].geometry.coordinates.length - 1
              ];
            var point1 = turf.point(p1);
            var point2 = turf.point(p2);
            var bearing = turf.bearing(point1, point2);
            //selectedObjects[i].properties.bearing = bearing;
            var currentProp = {
              bearing: bearing,
              oneway: selectedObjects[i].properties.ONEWAY,
              f_lines: selectedObjects[i].properties.F_LANES,
              t_lines: selectedObjects[i].properties.T_LANES,
              f_buslines: selectedObjects[i].properties.F_BUSLANES,
              t_buslines: selectedObjects[i].properties.T_BUSLANES
            };
            finPopup.push(currentProp);*/
            if (lanesCondition.selectedObjects[i].properties.RD_NAME) {
              lanesCondition.roadName =
                lanesCondition.selectedObjects[i].properties.RD_NAME;
            }
          } else if (
            lanesCondition.selectedObjects[i].properties.route_short_name
          ) {
            lanesCondition.ngptRoutes.push(
              lanesCondition.selectedObjects[i].properties.route_short_name
            );
          }
        }

        var lanes1 = [];
        var lanes2 = [];
        var bLanes1 = 0;
        var bLanes2 = 0;

        var result = [];

        function blow(finPopup) {
          var firstArcBearing = finPopup[0].bearing;
          //lanes1 = finPopup[0].f_lines;
          for (var i = 0; i < finPopup.length; i++) {
            var bearDiff = Math.abs(firstArcBearing - finPopup[i].bearing);

            if (bearDiff < 90) {
              lanes1.push(finPopup[i].f_lines);
              bLanes1 += finPopup[i].f_buslines;
              lanes2.push(finPopup[i].t_lines);
              bLanes2 += finPopup[i].t_buslines;
            } else {
              lanes2.push(finPopup[i].f_lines);
              bLanes1 += finPopup[i].t_buslines;
              lanes1.push(finPopup[i].t_lines);
              bLanes2 += finPopup[i].f_buslines;
            }
          }
          lanes1 = Math.max.apply(null, lanes1);
          lanes2 = Math.max.apply(null, lanes2);

          var order = [bLanes1, lanes1, lanes2, bLanes1];
          if (order[0] > 0) {
            result.push("A+");
          }
          if (order[1] > 0) {
            result.push(order[1]);
            result.push("▼");
          }
          if (order[2] > 0) {
            result.push(" | ");
            result.push("▲");
            result.push(order[2]);
          }
          if (order[3] > 0) {
            result.push("+A");
          }
        }

        blow(lanesCondition.finPopup);

        var loadsDOM;
        if (result.join("").length > 6) {
          loadsDOM =
            '"></br><input type="text" class="udsLoad" placeholder="" onchange="colorManager(event)" style="height:20px">→<input type="text" onchange="colorManager(event)" class="udsLoad" placeholder="" style="height:20px"> | ' +
            '<input type="text" class="udsLoad" placeholder="" onchange="colorManager(event)" style="height:20px" >→<input type="text" onchange="colorManager(event)" class="udsLoad" placeholder=""style="height:20px"></div>';
        } else {
          loadsDOM =
            '"></br><input type="text" class="udsLoad" placeholder="" onchange="colorManager(event)" style="height:20px">→<input type="text" onchange="colorManager(event)" class="udsLoad" placeholder="" style="height:20px"></div>';
        }
        //
        var nameString = "";

        if (lanesCondition.roadName && condition.popupRoadName) {
          var name = lanesCondition.roadName;
          var streets = {
            "просп.": "пр-т",
            шоссе: "ш.",
            "(дублер)": "",
            Проектируемый: "Пр.",
            километр: "км",
            "3-е транспортное кольцо": "ТТК"
          };

          for (var key in streets) {
            var re = new RegExp(key, "g");
            name = name.replace(re, streets[key]);
            name = name.replace(/\(\)/g, "");
          }
          nameString =
            '<input type="text" class="udsLanes" style="height:20px; background:none"  oninput="resizeText(event)" size="' +
            name.length +
            '" value="' +
            name +
            '">';
        }
        var routesCount = "";
        if (
          lanesCondition.ngptRoutes.length > 0 &&
          condition.popupRoutesCount
        ) {
          function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
          }
          //
          var ngpt = lanesCondition.ngptRoutes.filter(onlyUnique).length;
          /*
          routesCount =
            '<span class="delimiter"></span><div class="popNgptContainer"><div class="popNgpt"><div class="popNgptIcon"></div><span class="ngptCount" style="color:white">' +
            lanesCondition.ngptRoutes.filter(onlyUnique).length +
            "</span></div></div>";*/
          routesCount =
            '<span class="delimiter"></span><div class="popNgptContainer"><div class="popNgpt"><div class="popNgptIcon"></div><input type="text" class="ngptCount" style="height:20px; background:none; color:white"  oninput="resizeText(event)" size="' +
            ngpt.toString().length +
            '" value="' +
            ngpt +
            '"></div></div>';
          //
          //routesCount = lanesCondition.ngptRoutes.filter(onlyUnique).length;
          //routesCount = "</br>" + routesCount;
        }
        //
        var popup = new mapboxgl.Popup({
          closeOnClick: false
          //className: "my-class"
        })
          .setLngLat(centerTurf.geometry.coordinates)
          .setHTML(
            nameString +
              '<div class="popContent"><div class="popLines"><input type="text" class="udsLanes" style="height:20px" oninput="resizeText(event)" size="' +
              result.join("").length +
              '" value="' +
              result.join("") +
              loadsDOM +
              routesCount +
              "</div>"
          )
          .addTo(map);

        popup.getElement().addEventListener("contextmenu", (e) => {
          e.preventDefault();
          popup.trackPointer();
          map.once("contextmenu", (e) => {
            e.preventDefault();
            if (popup._trackPointer) {
              popup.setLngLat(e.lngLat);
            }
          });
        });

        /*popup.getElement().addEventListener("contextmenu", (e) => {
          e.preventDefault();
          const hit = map.unproject([e.x, e.y]);
          const initPos = popup._lngLat;
          const delta = [hit.lng - initPos.lng, hit.lat - initPos.lat];
          //console.log(delta);
          //
          function dragPopup(e, popup, delta) {
            const hit = map.unproject([e.x, e.y]);
            popup.setLngLat([hit.lng + delta[0], hit.lat + delta[1]]);
            console.log(hit);
          }
          document.body.addEventListener("mousemove", dragPopup);
        });*/
      }
      lanesCondition.coords = [];
      lanesCondition.pixels = [];
      lanesCondition.ngptRoutes = [];
      delete lanesCondition["roadName"];
      condition.lanes = false;
      map.getCanvas().style.cursor = "";
      popButton.className = "headerButton";

      lanesCondition.selectedObjects = [];
      lanesCondition.finPopup = [];
    }
  }
});

map.on("mousemove", function (e) {
  if (lanesCondition.state === true) {
    var pt = [e.lngLat.lng, e.lngLat.lat];
    var px = [e.point.x, e.point.y];
    lanesCondition.pixels[1] = px;
    lanesCondition.coords[1] = pt;
    currGeojson.features[0].geometry.coordinates = lanesCondition.coords;
    map.getSource("drawLineS").setData(currGeojson);

    var features = map.queryRenderedFeatures(lanesCondition.pixels, {
      layers: ["uds"]
    });
    /*
    var filter = features.reduce(
      function (memo, feature) {
        memo.push(feature.properties.ID);
        selectedObjects.push(feature);
        return memo;
      },
      ["in", "ID"]
    );*/

    var filter = ["in", "ID"];
    features.forEach((line) => {
      lanesCondition.selectedObjects.push(line);
      if (line.properties.F_LANES) {
        filter.push(line.properties.ID);
      }
    });
    map.setFilter("uds-selected", filter);
  }
});

const popButton = document.querySelector("#popup");
popButton.addEventListener("click", function (e) {
  if (condition.lanes === false) {
    condition.lanes = true;
    condition.iso = false;
    isoButton.className = "headerButton";
    map.getCanvas().style.cursor = "crosshair";
    e.currentTarget.className += " active";
  } else {
    condition.lanes = false;
    map.getCanvas().style.cursor = "";
    e.currentTarget.className = "headerButton";
  }
});

var dlDrawButton = document.getElementById("dlDraw");
dlDrawButton.addEventListener("click", function () {
  var dFeatures = draw.getAll();
  var bbox = map.getBounds();
  if (dFeatures.features.length !== 0) {
    dFeatures.bbox = [
      [bbox._sw.lng, bbox._sw.lat],
      [bbox._ne.lng, bbox._ne.lat]
    ];
    let fileName = prompt("Название файла", "polygon");
    var blob = new Blob([JSON.stringify(dFeatures)], {
      type: "application/json;charset=utf-8"
    });
    saveAs(blob, fileName + ".geojson");
  } else {
    alert("Ничего не нарисовано");
  }
});

function forwardGeocoder(query) {
  var matchingFeatures = [];
  if (query.match(/\d{1,2}:\d{1,2}:\d{6,7}:\d{1,4}/)) {
    var features = map.querySourceFeatures("cadastreSource", {
      sourceLayer: "isogd_kad_zu",
      filter: ["in", "kad_number", query]
    });

    if (features.length > 0) {
      var geo = turf.polygon(features[0].geometry.coordinates);

      for (var o = 1; o < features.length; o++) {
        var geo1 = geo;
        var geo2 = turf.polygon(features[o].geometry.coordinates);
        geo = turf.union(geo1, geo2);
      }

      var bbox = turf.bbox(geo);

      var feature = {
        place_name: query,
        place_type: ["place"],
        bbox: bbox,
        type: "Polygon",
        coordinates: geo.geometry.coordinates
      };
      //console.log(feature);
      matchingFeatures.push(feature);
    }
  }
  return matchingFeatures;
}

var geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  localGeocoder: forwardGeocoder,
  placeholder: "Адрес, кадастровый номер...",
  bbox: [
    36.540169324143605,
    55.020305819627616,
    38.3135420226066969,
    56.1505434064830737
  ]
});

document.getElementById("tab").appendChild(geocoder.onAdd(map));
geocoder.on("loading", () => {
  if (layersDOM.style.display != "none") {
    layersDOM.style.display = "none";
    layersButton.className = "headerButton";
  }
});
///////////////////////////////////////

var trans = 0;
var initH;
/*const launchButton = document.querySelector("#launch");
launchButton.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  if (condition.launch === true) {
    if (condition.clearLaunch === false) {
      map.moveLayer("tileset", "tpu");
      map.moveLayer("overlay", "tpu");
      map.setLayoutProperty("tpu", "visibility", "none");
      condition.clearLaunch = true;
      launchButton.style.background = "#1AAD41";
    } else {
      map.moveLayer("tileset", "roads-aip");
      map.moveLayer("overlay", "moscow-boundary");
      map.setLayoutProperty("tpu", "visibility", "visible");
      condition.clearLaunch = false;
      launchButton.style.background = "";
    }
  }
});
launchButton.addEventListener("click", function () {
  if (condition.launch === false) {
    launchButton.className += " active";
    enableSat();
    map.addLayer(
      tilesetLayer,
      "roads-aip" //"poi-label"
    );
    condition.launch = true;
  } else {
    disableSat();
    launchButton.className = "headerButton";
    launchButton.style.background = "";
    condition.launch = false;
    map.removeLayer("tileset");
  }

  map.moveLayer("overlay", "moscow-boundary");
  map.setLayoutProperty("tpu", "visibility", "visible");
  condition.clearLaunch = false;
  launchButton.style.background = "";
});*/
//////////////////////////////////////hide
const tab = document.querySelector("#tab");
function tabHide() {
  var rightControl = document.getElementsByClassName(
    "mapboxgl-ctrl-top-right"
  )[0];
  var bottomControl = document.getElementsByClassName(
    "mapboxgl-ctrl-bottom-left"
  )[0];
  var arrow = hide.children[0];
  var paletteContainer = document.querySelector("#palette");
  arrow.style.transition = "transform 200ms ease-in-out";
  var offset = tab.clientWidth + 2;
  if (tab.style.marginLeft == "") {
    tab.style.marginLeft = "-" + offset + "px";
    arrow.style.transform = "rotate(180deg)";
    rightControl.style.opacity = 0;
    bottomControl.style.opacity = 0;
    layersDOM.style.display = "none";
    if (condition.palette == true) {
      paletteHider();
    }
  } else {
    tab.style.marginLeft = "";
    arrow.style.transform = "rotate(0deg)";
    rightControl.style.opacity = 1;
    bottomControl.style.opacity = 1;
  }
}
hide.addEventListener("click", tabHide);

/////////////////////////////////////image
function getRectFourPoints(width, height, ang) {
  var Xes = [0];
  var Yes = [0];

  const sinAng = Math.sin(ang);
  const cosAng = Math.cos(ang);

  let upDiff = sinAng * width;
  let sideDiff = cosAng * width;
  var secX = sideDiff;
  var secY = upDiff;
  Xes.push(sideDiff);
  Yes.push(upDiff);

  upDiff = cosAng * height;
  sideDiff = sinAng * height;

  Xes.push(sideDiff);
  Yes.push(-upDiff);

  Xes.push(secX + sideDiff);
  Yes.push(secY - upDiff);

  var x = Math.max.apply(null, Xes) - Math.min.apply(null, Xes);
  var y = Math.max.apply(null, Yes) - Math.min.apply(null, Yes);
  return [x, y];
}
function rotationImage(a, b, s) {
  var ang = a * (Math.PI / 180);

  var size = getRectFourPoints(picProps.initialX, picProps.initialY, ang);
  canvas.width = size[0];
  canvas.height = size[1];

  var offsetX = canvas.width / 2;
  var offsetY = canvas.height / 2;
  ctx.translate(offsetX, offsetY);
  ctx.rotate(ang);
  ctx.translate(-offsetX, -offsetY);
  ctx.drawImage(
    pic,
    (size[0] - picProps.initialX) / 2,
    (size[1] - picProps.initialY) / 2,
    picProps.picWidth,
    picProps.picHeight
  );

  var rotatedPoly = turf.transformRotate(picRect.features[0], b, {
    pivot: helperPoints.firstPoint
  });
  var polyScaled = turf.transformScale(rotatedPoly, s, {
    origin: helperPoints.firstPoint
  });
  picRectTemp = {
    type: "FeatureCollection",
    features: [polyScaled]
  };
  map.getSource("rectS2").setData(picRectTemp);
  var bbox = turf.bboxPolygon(turf.bbox(polyScaled));
  var newCoords = [
    bbox.geometry.coordinates[0][3],
    bbox.geometry.coordinates[0][2],
    bbox.geometry.coordinates[0][1],
    bbox.geometry.coordinates[0][0]
  ];
  bboxRectTemp = {
    type: "FeatureCollection",
    features: [bbox]
  };
  map.getSource("canvas-source").setCoordinates(newCoords);
  map.getSource("rectS").setData(bboxRectTemp);
}

function rotateStart(e) {
  if (!helperPoints.firstPoint && !e.originalEvent.altKey) {
    //condition.toggleScaleRotate = true;
    polyReset = map.getSource("canvas-source").coordinates;
    resetAngle = angle;
    map.getCanvas().style.cursor = "crosshair";
    helperPoints.firstPoint = [e.lngLat.lng, e.lngLat.lat];
    data1.features[0].geometry.coordinates = helperPoints.firstPoint;
    data1.features[1].geometry.coordinates[0] = helperPoints.firstPoint;
    data1.features[1].geometry.coordinates[1] = helperPoints.firstPoint;
    map.getSource("helperS").setData(data1);
    map.on("mousemove", secondPointFinder);
    map.on("click", thirdPointStart);
  }
}
function secondPointFinder(e) {
  if (helperPoints.firstPoint) {
    helperPoints.secondPoint = [e.lngLat.lng, e.lngLat.lat];
    data1.features[1].geometry.coordinates[1] = helperPoints.secondPoint;
    map.getSource("helperS").setData(data1);
  }
}

function thirdPointStart(e) {
  if (helperPoints.secondPoint) {
    map.off("mousemove", secondPointFinder);
    data2.features[0].geometry.coordinates = helperPoints.firstPoint;
    data2.features[1].geometry.coordinates[0] = helperPoints.firstPoint;
    data2.features[1].geometry.coordinates[1] = helperPoints.firstPoint;
    map.getSource("helperS2").setData(data2);
    map.on("mousemove", thirdPointFinder);
    map.off("click", thirdPointStart);

    polyReset = map.getSource("canvas-source").coordinates;
  }
}

function thirdPointFinder(e) {
  helperPoints.thirdPoint = [e.lngLat.lng, e.lngLat.lat];
  data2.features[1].geometry.coordinates[1] = helperPoints.thirdPoint;
  map.getSource("helperS2").setData(data2);
  var bearing1 = turf.bearing(
    helperPoints.firstPoint,
    helperPoints.secondPoint
  );
  var bearing2 = turf.bearing(helperPoints.firstPoint, helperPoints.thirdPoint);
  bearing = bearing2 - bearing1;

  var line1 = turf.lineString([
    helperPoints.firstPoint,
    helperPoints.secondPoint
  ]);
  var length1 = turf.length(line1, { units: "meters" });

  var line2 = turf.lineString([
    helperPoints.firstPoint,
    helperPoints.thirdPoint
  ]);
  var length2 = turf.length(line2, { units: "meters" });

  ratio = length2 / length1;
  var newAngle = angle + bearing;
  rotationImage(newAngle, bearing, ratio);
  map.once("click", () => {
    if (helperPoints.thirdPoint) {
      angle = angle + bearing;
      map.off("mousemove", thirdPointFinder);
      map.getCanvas().style.cursor = "";
      picRect = picRectTemp;
      map.getSource("rectS2").setData(picRect);

      bboxRect = bboxRectTemp;
      map.getSource("rectS").setData(bboxRect);
      helperPoints = {};
      map.getSource("helperS").setData(dataNullproper);
      map.getSource("helperS2").setData(dataNullproper);

      //condition.toggleScaleRotate = false;
    }
  });
}

function moveStart(evt) {
  if (evt.originalEvent.altKey && !helperPoints.firstPoint) {
    evt.preventDefault();
    map.dragRotate.disable();
    //condition.toggleMove = true;
    map.getCanvas().style.cursor = "crosshair";
    helperPoints.firstPoint = [evt.lngLat.lng, evt.lngLat.lat];
    data1.features[0].geometry.coordinates = helperPoints.firstPoint;
    data1.features[1].geometry.coordinates[0] = helperPoints.firstPoint;
    data1.features[1].geometry.coordinates[1] = helperPoints.firstPoint;
    map.getSource("helperS").setData(data1);
    //initialPolyCoords = data.features[0].geometry.coordinates;
    map.on("mousemove", moveImage);
    polyReset = map.getSource("canvas-source").coordinates;
  }
}
function moveImage(e) {
  if (helperPoints.firstPoint) {
    e.preventDefault();
    helperPoints.secondPoint = [e.lngLat.lng, e.lngLat.lat];
    var distance = turf.distance(
      helperPoints.firstPoint,
      helperPoints.secondPoint
    );
    var bearing = turf.bearing(
      helperPoints.firstPoint,
      helperPoints.secondPoint
    );
    var translatedPoly = turf.transformTranslate(
      picRect.features[0],
      distance,
      bearing
    );
    picRectTemp = {
      type: "FeatureCollection",
      features: [translatedPoly]
    };

    map.getSource("rectS2").setData(picRectTemp);
    bboxRectTemp = {
      type: "FeatureCollection",
      features: [turf.bboxPolygon(turf.bbox(translatedPoly))]
    };
    map.getSource("rectS").setData(bboxRectTemp);

    var crd = bboxRectTemp.features[0].geometry.coordinates[0];
    var bbx = [crd[3], crd[2], crd[1], crd[0]];
    map.getSource("canvas-source").setCoordinates(bbx);

    data1.features[1].geometry.coordinates[1] = helperPoints.secondPoint;
    map.getSource("helperS").setData(data1);

    map.once("click", finMove);
  }
}
function finMove(e) {
  if (helperPoints.secondPoint) {
    e.preventDefault();
    helperPoints = {};
    data1 = JSON.parse(JSON.stringify(dataNullproper));
    data2 = JSON.parse(JSON.stringify(dataNullproper));

    map.getSource("helperS").setData(data1);
    map.getSource("helperS2").setData(data2);

    picRect = picRectTemp;
    map.getSource("rectS2").setData(picRect);

    bboxRect = bboxRectTemp;
    map.getSource("rectS").setData(bboxRect);
    map.off("mousemove", moveImage);
    map.off("contextmenu", finMove);
    map.getCanvas().style.cursor = "";
    //condition.toggleMove = false;
  }
}

function abortEsc({ key }) {
  if (
    (key === "Escape" && condition.toggleScaleRotate === true) ||
    (key === "Escape" && condition.toggleMove === true)
  ) {
    //editImageButton.className = "headerButton";
    //imageGeorefDOM.className = "";
    //condition.toggleScaleRotate = false;
    map.dragRotate.enable();
    //imgOpacity.style.display = "none";
    //clearImageButton.style.display = "none";
    //map.setLayoutProperty("rect", "visibility", "none");
    //map.off("mousedown", "rect", moveStart);
    //map.off("click", "rect", rotateStart);
    map.getCanvas().style.cursor = "";
    //maskTabDOM.style.display = "";
    map.getSource("canvas-source").setCoordinates(polyReset);

    data.features[0].geometry.coordinates = [
      [polyReset[0], polyReset[1], polyReset[2], polyReset[3], polyReset[0]]
    ];

    map.getSource("rectS").setData(bboxRect);
    map.getSource("rectS2").setData(picRect);
    rotationImage(resetAngle, 0, 1);
    polyReset = null;
    resetAngle = null;
    map.off("mousemove", secondPointFinder);
    map.off("mousemove", thirdPointFinder);
    map.off("click", thirdPointStart);
    map.off("click", rotationImage);
    map.off("mousemove", moveImage);
    map.off("click", finMove);
    map.getSource("helperS").setData(dataNullproper);
    map.getSource("helperS2").setData(dataNullproper);
    helperPoints = {};
  }
}
document.addEventListener("keydown", abortEsc);

var preview = document.querySelector("img");
///////////////////////////////////////////
let imgOpacity = document.querySelector("#imgOpacity");
let clearImageButton = document.querySelector("#clearImageButton");
let saveImageButton = document.querySelector("#saveImageButton");

function toggleGeoreference() {
  if (condition.toggleScaleRotate === false) {
    editImageButton.className += " active";
    imageGeorefDOM.className = "moving";
    maskTabDOM.style.display = "block";
    condition.toggleScaleRotate = true;
    condition.toggleMove = true;
    imgOpacity.style.display = "flex";
    saveImageButton.style.display = "block";
    clearImageButton.style.display = "block";

    map.setLayoutProperty("rect", "visibility", "visible");
    map.on("click", "rect2", rotateStart);
    map.on("click", "rect2", moveStart);
    map.getCanvas().style.cursor = "move";
  } else {
    //editImageButton.style.background = "white";
    editImageButton.className = "headerButton";
    imageGeorefDOM.className = "";
    maskTabDOM.style.display = "";
    condition.toggleScaleRotate = false;
    condition.toggleMove = false;
    map.dragRotate.enable();
    imgOpacity.style.display = "none";
    clearImageButton.style.display = "none";
    saveImageButton.style.display = "none";
    map.setLayoutProperty("rect", "visibility", "none");
    map.off("click", "rect2", rotateStart);
    map.off("click", "rect2", moveStart);
    map.getCanvas().style.cursor = "";
  }
}

const imageGeorefDOM = document.querySelector("#imageGeoref");
const maskTabDOM = document.querySelector("#maskTab");
const editImageButton = document.querySelector("#editImageButton");
editImageButton.addEventListener("click", toggleGeoreference);

imgOpacity.addEventListener("input", function () {
  var opacity = parseFloat(imgOpacity.value);
  map.setPaintProperty("canvas-layer", "raster-opacity", opacity);
});
clearImageButton.addEventListener("click", function () {
  let likeForReal = confirm("Удалить изображение?");
  if (likeForReal) {
    var currentCanvas = document.getElementById("canvasID");
    if (currentCanvas) {
      currentCanvas.remove();
      map.removeLayer("canvas-layer");
      map.removeSource("canvas-source");
      condition.toggleMove = false;
      condition.toggleScaleRotate = false;
      imgOpacity.style.display = "none";
      clearImageButton.style.display = "none";
      saveImageButton.style.display = "none";
      imageGeorefDOM.style.display = "none";
      map.getCanvas().style.cursor = "";
      document.getElementById("overlayId").remove();
      picProps = {};
      polyReset = null;
      angle = 0;
      resetAngle = null;
      ratio = 1;
      bearing = null;
      helperPoints = {};
      ctx = null;
      ctxTemp = null;
      canvas = null;
      canvasTemp = null;

      map.off("click", "rect2", rotateStart);
      map.off("click", "rect2", moveStart);
      map.off("mousemove", secondPointFinder);
      map.off("mousemove", thirdPointFinder);
      map.off("click", thirdPointStart);
      map.off("click", rotationImage);
      map.off("mousemove", moveImage);
      map.off("click", finMove);
      map.getSource("helperS").setData(dataNullproper);
      map.getSource("helperS2").setData(dataNullproper);
      map.getSource("rectS2").setData(dataNullproper);
      map.getSource("rectS").setData(dataNullproper);
      var overlayDOM = document.querySelector("#overlayId");
      if (overlayDOM) {
        overlayDOM.remove();
      }
    }
  }

  /*
  var state = map.getLayoutProperty("canvas-layer", "visibility");
  if (state === "visible") {
    map.removeLayer("canvas-layer");
    map.removeSource("canvas-source");

    map.setLayoutProperty("rect", "visibility", "none");
    //imageGeorefDOM.style.background = "white";
    condition.toggleMove = false;
    condition.toggleScaleRotate = false;
    map.dragRotate.enable();
    imgOpacity.style.display = "none";
    clearImageButton.style.display = "none";
    imageGeorefDOM.style.display = "none";
    map.setLayoutProperty("rect", "visibility", "none");
    //map.off("mousedown", "rect", moveStart);
    // map.off("click", "rect", resizeStart);
    map.getCanvas().style.cursor = "";
    document.getElementById("overlayId").remove();
  }*/
});
saveImageButton.addEventListener("click", function () {
  //console.log(map.getSource("rectS2")._data);
  var name = prompt("Название изображения:", [fileName.join(".") + "_georef"]);
  if (name) {
    //saveAs(pic.src, name);
    var tempUrl = canvas.toDataURL();
    var link = document.createElement("a");
    link.download = name + "." + extension;
    link.href = tempUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    generateWorldFile(
      //bboxRect.features[0],
      map.getSource("rectS2")._data.features[0],
      ctx.canvas.width,
      ctx.canvas.height,
      name
    );
  }
});

function generateWorldFile(bbox, width, height, fileName) {
  var bounds = turf.bbox(bbox);
  console.log(bounds);
  var coords = turf.toMercator(turf.point([bounds[0], bounds[3]])).geometry
    .coordinates;
  var w =
    turf.toMercator(turf.point([bounds[2], bounds[3]])).geometry
      .coordinates[0] -
    turf.toMercator(turf.point([bounds[0], bounds[3]])).geometry.coordinates[0];
  var h =
    turf.toMercator(turf.point([bounds[0], bounds[3]])).geometry
      .coordinates[1] -
    turf.toMercator(turf.point([bounds[0], bounds[1]])).geometry.coordinates[1];
  var worldString =
    w / width +
    "\n" +
    "0.0000000000000" +
    "\n" +
    "0.0000000000000" +
    "\n" +
    "-" +
    h / height +
    "\n" +
    coords[0] + //bbox[0][0] +
    "\n" +
    coords[1]; //bbox[0][1];
  var blob = new Blob([worldString], { type: "text/plain;charset=utf-8" });

  saveAs(blob, fileName + ".wld");
}
////////////////////////////////////////////////////
/////////////////////////////////////////////////////
//////////////////////////////////////////////////////
map.on("pitch", function () {
  if (
    //condition.satellite === false &&
    // condition.launch === false &&
    condition.buildings === true
  ) {
    if (map.getPitch() > 0 && map.getZoom() > 15) {
      if (condition.extruded == false) {
        condition.extruded = true;
        map.setLayoutProperty("3d-gzk", "visibility", "visible");
        map.setPaintProperty("3d-gzk", "fill-extrusion-opacity", 0.6);
        map.setLayoutProperty("3d-buildings", "visibility", "visible");
        map.setPaintProperty("3d-buildings", "fill-extrusion-opacity", 0.6);
        //
        map.setPaintProperty("buildings", "fill-opacity", 0);
        map.setPaintProperty("gzk", "fill-opacity", 0);
        map.setPaintProperty("gzk-case", "line-opacity", 0);
        //
        setTimeout(() => {
          map.setLayoutProperty("buildings", "visibility", "none");
          map.setLayoutProperty("gzk", "visibility", "none");
          map.setLayoutProperty("gzk-case", "visibility", "none");
        }, condition.delay);
      }
      /*map.setLayoutProperty("3d-buildings", "visibility", "visible");
      map.setLayoutProperty("3d-gzk", "visibility", "visible");
      map.setLayoutProperty("buildings", "visibility", "none");*/
    } else {
      setTimeout(() => {
        map.setLayoutProperty("3d-gzk", "visibility", "none");
        map.setLayoutProperty("3d-buildings", "visibility", "none");
        condition.extruded = false;
      }, condition.delay);
      map.setPaintProperty("3d-gzk", "fill-extrusion-opacity", 0);
      map.setPaintProperty("3d-buildings", "fill-extrusion-opacity", 0);
      //
      map.setLayoutProperty("buildings", "visibility", "visible");
      map.setLayoutProperty("gzk", "visibility", "visible");
      map.setLayoutProperty("gzk-case", "visibility", "visible");
      //
      map.setPaintProperty("buildings", "fill-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        0,
        13.5,
        1
      ]);
      map.setPaintProperty("gzk", "fill-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        0,
        13.5,
        0.8
      ]);
      map.setPaintProperty("gzk-case", "line-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        0,
        13.5,
        1
      ]);
      /*map.setLayoutProperty("3d-buildings", "visibility", "none");
      map.setLayoutProperty("3d-gzk", "visibility", "none");
      map.setLayoutProperty("buildings", "visibility", "visible");*/
    }
  }
});

map.on("zoom", function () {
  if (
    // condition.satellite === false &&
    //condition.launch === false &&
    condition.buildings === true
  ) {
    if (map.getPitch() > 0 && map.getZoom() > 15) {
      map.setLayoutProperty("3d-buildings", "visibility", "visible");
      map.setLayoutProperty("3d-gzk", "visibility", "visible");
      //map.setLayoutProperty("3d-personal", "visibility", "visible");
      //map.setLayoutProperty("3d-krt", "visibility", "visible");
      map.setLayoutProperty("buildings", "visibility", "none");
      //map.setLayoutProperty("buildings2", "visibility", "none");
    } else {
      map.setLayoutProperty("3d-buildings", "visibility", "none");
      map.setLayoutProperty("3d-gzk", "visibility", "none");
      //map.setLayoutProperty("3d-personal", "visibility", "none");
      //map.setLayoutProperty("3d-krt", "visibility", "none");
      map.setLayoutProperty("buildings", "visibility", "visible");
      //map.setLayoutProperty("buildings2", "visibility", "visible");
    }
  }
});
/////////////////////////////////////////////////////////////geocoder
geocoder.on("loading", function (query) {
  //console.log(query.query);
  var input = query.query;
  if (input.substring(0, 3) === "77:") {
    //console.log("wait a second!");
    for (var i = 0; i < cadOkruga.length; i++) {
      if (input.substring(0, 5) === cadOkruga[i]) {
        //console.log(map.getZoom());
        map.fitBounds([cadBboxes[i][0], cadBboxes[i][1]], {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15
        });
      }
    }
  }
  if (input.match(/\d{1,2}:\d{1,2}:\d{6,7}:\d{1,4}/)) {
    map.once("idle", () => {
      var features = map.querySourceFeatures("cadastreSource", {
        sourceLayer: "isogd_kad_zu",
        filter: ["in", "kad_number", input]
      });
      // console.log(features, map.getZoom());
      if (features.length > 0) {
        var geo = turf.polygon(features[0].geometry.coordinates);

        for (var o = 1; o < features.length; o++) {
          var geo1 = geo;
          var geo2 = turf.polygon(features[o].geometry.coordinates);
          geo = turf.union(geo1, geo2);
        }
        var bbox = turf.bbox(geo);
        map.fitBounds(bbox, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 15
        });
        map.once("idle", () => {
          var features = map.querySourceFeatures("cadastreSource", {
            sourceLayer: "isogd_kad_zu",
            filter: ["in", "kad_number", input]
          });

          if (features.length > 0) {
            var geo = turf.polygon(features[0].geometry.coordinates);

            for (var o = 1; o < features.length; o++) {
              var geo1 = geo;
              var geo2 = turf.polygon(features[o].geometry.coordinates);
              geo = turf.union(geo1, geo2);
            }
          }

          var feature = {
            place_name: input,
            place_type: ["place"],
            bbox: bbox,
            type: "Polygon",
            coordinates: geo.geometry.coordinates
          };
          draw.add(feature);
          //console.log(feature);
        });
      }
    });
  }
});

/*geocoder.on("result", function (result) {
  if (result.result.type === "Polygon") {
    draw.add(result.result);
  }
  //var cadNum = result.result.place_name;
  //map.setFilter("cadastre", ["in", "kad_number", cadNum]);
});*/
/*geocoder.on("loading", function (query) {
  //console.log(query.query);
  var input = query.query;
  if (input.substring(0, 3) === "77:") {
    //console.log("wait a second!");
    for (var i = 0; i < okruga.length; i++) {
      if (input.substring(0, 5) === okruga[i]) {
        //console.log(map.getZoom());
        map.fitBounds([bboxes[i][0], bboxes[i][1]], {
          padding: { top: 100, bottom: 100, left: 100, right: 100 }
        });
      }
    }
  }
});*/
//////////////////////////////MODELS
/*
const loadLinkFootprint = document.querySelector("#loadLinkFootprint");
const linkFootprint = document.querySelector("#linkFootprint");
const closeModelDOM = document.querySelector("#closeModelDOM");
var modelDOM = document.querySelector("#modelDOM");
var modelLoadButton = document.querySelector("#modelLoadDOM");
if (modelLoadButton) {
  modelLoadButton.addEventListener("click", function () {
    if (modelDOM.style.display === "flex") {
      modelDOM.style.display = "none";
      modelLoadButton.className = "headerButton";
    } else {
      modelDOM.style.display = "flex";
      modelLoadButton.className += " active";
      linkFootprint.focus();
      linkFootprint.select();
    }
  });
}

closeModelDOM.addEventListener("click", function () {
  modelDOM.style.display = "none";
  modelLoadButton.className = "headerButton";
});

loadLinkFootprint.addEventListener("click", async function (e) {
  e.preventDefault();
  url = linkFootprint.value;
  fetch(url)
    .then((response) => response.json())
    .then((commits) => {
      jsonRersponse = commits;
      if (map.getLayer("customGLTF")) {
        map.removeLayer("customGLTF");
      }

      drawCustomLayer(0);
      map.flyTo({
        center: [jsonRersponse.coords.gltf_lon, jsonRersponse.coords.gltf_lat],
        zoom: 14
      });

      //Deck.setProps({ effects: lightingEffect });
    });
  modelDOM.style.display = "none";
  modelLoadButton.className = "headerButton";
});

var grounded = false;
var customLayer;
var url;
var jsonRersponse;
const url =
  "https://smart.mos.ru/geodata/3dtiles/bim/00283/Zelenograd_korp344%D0%90_school300.json";
var jsonRersponse;
fetch(url)
  .then((response) => response.json())
  .then((commits) => {
    jsonRersponse = commits;
    drawCustomLayer(0);
  });

function heightChange() {
  if (grounded === false) {
    map.removeLayer("customGLTF");
    drawCustomLayer(-jsonRersponse.h);
    //map.addLayer(customLayer);
    grounded = true;
    //console.log(deck);
    // deck.setProps({ effects: lightingEffect });
  } else {
    map.removeLayer("customGLTF");
    drawCustomLayer(0);
    //map.addLayer(customLayer);
    grounded = false;
  }
}
//var popup = new mapboxgl.Popup();
function drawCustomLayer(height) {
  var uriBaseLength = url.lastIndexOf("/");
  var uriBase = url.substr(0, uriBaseLength + 1);
  var uri = uriBase + jsonRersponse.name + ".gltf";
  load(uri, GLTFLoader).then((response) => {
    for (var i = 0; i < response.materials.length; i++) {
      delete response.materials[i].pbrMetallicRoughness["baseColorTexture"];
      response.materials[i].pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
    }
    //response.materials[0].emissiveFactor = [1, 1, 1];
    //console.log(response);

    customLayer = new MapboxLayer({
      id: "customGLTF",
      type: ScenegraphLayer,
      scenegraph: response,
      // opacity: 0.8,
      data: [
        {
          coordinates: [
            jsonRersponse.coords.gltf_lon,
            jsonRersponse.coords.gltf_lat
          ],
          translation: [0, 0, trans]
        }
      ],
      pickable: true,
      onClick: function (e) {
        var heightButton =
          "<button class='addPpt' id='heightChangeButton'style='cursor:ns-resize'>Опустить/поднять</button>";
        var deleteButton =
          "<button class='addPpt' id='deleteModelButton'>Удалить</button>";
        popup
          .setLngLat(e.coordinate) //([jsonRersponse.coords.gltf_lon, jsonRersponse.coords.gltf_lat])
          .setHTML(
            "<b>Объект: </b>" +
              jsonRersponse.info +
              "</br><b>Дата: </b>" +
              jsonRersponse.groupName +
              "</br>" +
              heightButton +
              deleteButton
          )
          .addTo(map);
        document
          .querySelector("#deleteModelButton")
          .addEventListener("click", function () {
            grounded = false;
            customLayer = undefined;
            url = undefined;
            jsonRersponse = undefined;
            map.removeLayer("customGLTF");
            popup.remove();
          });
        document
          .querySelector("#heightChangeButton")
          .addEventListener("mousedown", function (e) {
            var intViewportHeight = window.innerHeight;
            initH = intViewportHeight - e.clientY;

            window.addEventListener("mousemove", onMoveH);
            window.addEventListener("mouseup", function () {
              window.removeEventListener("mousemove", onMoveH);
            });
          });
      },
      getPosition: (d) => d.coordinates,
      getOrientation: [0, 0, 90],
      getTranslation: (d) => d.translation,
      getColor: [251, 66, 90, 255], //[218, 32, 49, 255],
      parameters: {
        //depthTest: false
        depthRange: [0, 0.1]
      },
      _lighting: "pbr"
    });
    map.addLayer(customLayer, "poi-label");
  });
}
function onMoveH(e) {
  var intViewportHeight = window.innerHeight;
  var pos = intViewportHeight - e.clientY;
  var diff = initH - pos;
  if (Math.abs(diff) < jsonRersponse.h + 100) {
    trans = -diff;
    customLayer.setProps({
      data: [
        {
          coordinates: [
            jsonRersponse.coords.gltf_lon,
            jsonRersponse.coords.gltf_lat
          ],
          translation: [0, 0, trans]
        }
      ]
    });
  }
}
*/
///////////////////////////////////////////////////////////////////////////
var loadingScreen = document.querySelector("#loadingScreen");

////////////////////////////////////////////////////////////////////////////

var downloadBar = document.getElementById("barScreenshot");
var widthBar = 0;
var progressBar;
function frame() {
  if (widthBar >= 100) {
    clearInterval(progressBar);
  } else {
    widthBar++;
    downloadBar.style.width = widthBar + "%";
  }
}
////////////////////////
var downloadImage = document.querySelector("#download");

document.querySelector("#closeQualityDOM").onclick = () => {
  document.querySelector("#qualityRangeDOM").style.display = "none";
};

document.querySelector("#qualityRange").oninput = (e) => {
  qualityExport = parseInt(e.target.value);
  console.log(qualityExport);
  //document.querySelector("#qualityRangeDOM").style.display = "none";
};

//
downloadImage.addEventListener("click", function (e) {
  if (e.ctrlKey) {
    document.querySelector("#qualityRangeDOM").style.display = "flex";
  } else {
    downloadBar.style.width = "1%";
    loadingScreen.style.display = "block";
    progressBar = setInterval(frame, 300);
    tabHide();

    var actualPixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", {
      get() {
        return qualityExport; //this_.dpi / 96;
      }
    });

    //mapDOM.style.width = "1000px"; //this.toPixels(this.width);
    //mapDOM.style.height = "1000px"; //this.toPixels(this.height);
    map.resize();
    if (condition.launch == true) {
      condition.saving3D = true;
      condition.saving3Dtimer = true;
      setTimeout(() => {
        if (condition.saving3Dtimer == true) {
          // saveImage();
          saveDoubleImage();
          console.log("OK, enough");
        }
      }, 30000);
    } else {
      condition.saving2D = true;
      //map.once("idle", () => saveImage);
      var tilesCheck = setInterval(() => {
        if (map.areTilesLoaded() == true) {
          clearInterval(tilesCheck);
          saveDoubleImage();
          //saveImage();
          condition.saving2D = false;
        }
      }, 500);
      setTimeout(() => {
        if (condition.saving2D == true) {
          //saveImage();
          saveDoubleImage();
          console.log("OK, enough");
          clearInterval(tilesCheck);
          condition.saving2D = false;
        }
      }, 30000);
    }
  }
});

downloadImage.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  downloadBar.style.width = "1%";
  loadingScreen.style.display = "block";
  progressBar = setInterval(frame, 300);
  tabHide();

  var actualPixelRatio = window.devicePixelRatio;
  Object.defineProperty(window, "devicePixelRatio", {
    get() {
      return qualityExport; //this_.dpi / 96;
    }
  });

  //mapDOM.style.width = "1000px"; //this.toPixels(this.width);
  //mapDOM.style.height = "1000px"; //this.toPixels(this.height);
  map.resize();
  if (condition.launch == true) {
    condition.saving3D = true;
    condition.saving3Dtimer = true;
    setTimeout(() => {
      if (condition.saving3Dtimer == true) {
        // saveImage();
        saveImage();
        console.log("OK, enough");
      }
    }, 30000);
  } else {
    condition.saving2D = true;
    //map.once("idle", () => saveImage);
    var tilesCheck = setInterval(() => {
      if (map.areTilesLoaded() == true) {
        clearInterval(tilesCheck);
        saveImage();
        //saveImage();
        condition.saving2D = false;
      }
    }, 500);
    setTimeout(() => {
      if (condition.saving2D == true) {
        //saveImage();
        saveImage();
        console.log("OK, enough");
        clearInterval(tilesCheck);
        condition.saving2D = false;
      }
    }, 30000);
  }
});

removeWatermark();
//setTimeout(removeWatermark, 1000);
///////////////////////////////////
//custom draw
const polyButton = document.getElementsByClassName(
  "mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_polygon"
)[0];
polyButton.style.backgroundImage =
  "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNC4xLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgdmlld0JveD0iMCAwIDIwIDIwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyMCAyMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGcgaWQ9InN2ZzE5MTY3IiBpbmtzY2FwZTp2ZXJzaW9uPSIwLjkxK2RldmVsK29zeG1lbnUgcjEyOTExIiBzb2RpcG9kaTpkb2NuYW1lPSJzcXVhcmUuc3ZnIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQoJDQoJCTxzb2RpcG9kaTpuYW1lZHZpZXcgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IiBib3JkZXJvcGFjaXR5PSIxLjAiIGlkPSJiYXNlIiBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJsYXllcjEiIGlua3NjYXBlOmN4PSIxMS42ODE2MzQiIGlua3NjYXBlOmN5PSI5LjI4NTcxNDMiIGlua3NjYXBlOmRvY3VtZW50LXVuaXRzPSJweCIgaW5rc2NhcGU6b2JqZWN0LW5vZGVzPSJ0cnVlIiBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIiBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIiBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI3NTEiIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjAiIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTI4MCIgaW5rc2NhcGU6d2luZG93LXg9IjAiIGlua3NjYXBlOndpbmRvdy15PSIyMyIgaW5rc2NhcGU6em9vbT0iMTEuMzEzNzA4IiBwYWdlY29sb3I9IiNmZmZmZmYiIHNob3dncmlkPSJ0cnVlIiB1bml0cz0icHgiPg0KCQk8aW5rc2NhcGU6Z3JpZCAgaWQ9ImdyaWQxOTcxNSIgdHlwZT0ieHlncmlkIj48L2lua3NjYXBlOmdyaWQ+DQoJPC9zb2RpcG9kaTpuYW1lZHZpZXc+DQoJPHBhdGggZD0iTTE1LDEybDAtMi4zYzAuNi0wLjQsMS0xLDEtMS43YzAtMS4xLTAuOS0yLTItMmMtMC41LDAtMSwwLjItMS40LDAuNkw3LjksNS4yQzcuNyw0LjQsNi45LDMuNyw2LDMuN2MtMS4xLDAtMiwwLjktMiwyDQoJCWMwLDAuNywwLjQsMS40LDEsMS43bC0wLjEsNS42QzQuMywxMy40LDQsMTQsNCwxNC43YzAsMS4xLDAuOSwyLDIsMmMwLjgsMCwxLjUtMC41LDEuOC0xLjJsNC42LTAuNmMwLjQsMC41LDAuOSwwLjgsMS42LDAuOA0KCQljMS4xLDAsMi0wLjksMi0yQzE2LDEzLDE1LjYsMTIuMywxNSwxMnogTTguMiwxMy40bC0xLjMtMS4yTDcsOC42bDEuNS0xLjFsMy41LDFjMC4xLDAuNSwwLjUsMSwxLDEuM2wwLDIuMUwxMiwxM0w4LjIsMTMuNHoiLz4NCjwvZz4NCjxnIGlkPSLQodC70L7QuV8yIj4NCjwvZz4NCjwvc3ZnPg0K)";
polyButton.style.backgroundSize = "20px";
var drawContainer = document.getElementsByClassName(
  "mapboxgl-ctrl-group mapboxgl-ctrl"
)[0];

var pointDraw = document.getElementsByClassName(
  "mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_point"
)[0];
var rectButton = document.createElement("button");
rectButton.className = "mapbox-gl-draw_ctrl-draw-btn";
rectButton.title = "Rotated rectangle tool";
rectButton.style.backgroundSize = "20px";
rectButton.style.backgroundImage =
  "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PHN2ZyAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiICAgd2lkdGg9IjIwIiAgIGhlaWdodD0iMjAiICAgdmlld0JveD0iMCAwIDIwIDIwIiAgIGlkPSJzdmcxOTE2NyIgICB2ZXJzaW9uPSIxLjEiICAgaW5rc2NhcGU6dmVyc2lvbj0iMC45MStkZXZlbCtvc3htZW51IHIxMjkxMSIgICBzb2RpcG9kaTpkb2NuYW1lPSJzcXVhcmUuc3ZnIj4gIDxkZWZzICAgICBpZD0iZGVmczE5MTY5IiAvPiAgPHNvZGlwb2RpOm5hbWVkdmlldyAgICAgaWQ9ImJhc2UiICAgICBwYWdlY29sb3I9IiNmZmZmZmYiICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIgICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIgICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIiAgICAgaW5rc2NhcGU6em9vbT0iMTEuMzEzNzA4IiAgICAgaW5rc2NhcGU6Y3g9IjExLjY4MTYzNCIgICAgIGlua3NjYXBlOmN5PSI5LjI4NTcxNDMiICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0icHgiICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJsYXllcjEiICAgICBzaG93Z3JpZD0idHJ1ZSIgICAgIHVuaXRzPSJweCIgICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTI4MCIgICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijc1MSIgICAgIGlua3NjYXBlOndpbmRvdy14PSIwIiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjIzIiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIgICAgIGlua3NjYXBlOm9iamVjdC1ub2Rlcz0idHJ1ZSI+ICAgIDxpbmtzY2FwZTpncmlkICAgICAgIHR5cGU9Inh5Z3JpZCIgICAgICAgaWQ9ImdyaWQxOTcxNSIgLz4gIDwvc29kaXBvZGk6bmFtZWR2aWV3PiAgPG1ldGFkYXRhICAgICBpZD0ibWV0YWRhdGExOTE3MiI+ICAgIDxyZGY6UkRGPiAgICAgIDxjYzpXb3JrICAgICAgICAgcmRmOmFib3V0PSIiPiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+ICAgICAgICA8ZGM6dHlwZSAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIgLz4gICAgICAgIDxkYzp0aXRsZSAvPiAgICAgIDwvY2M6V29yaz4gICAgPC9yZGY6UkRGPiAgPC9tZXRhZGF0YT4gIDxnICAgICBpbmtzY2FwZTpsYWJlbD0iTGF5ZXIgMSIgICAgIGlua3NjYXBlOmdyb3VwbW9kZT0ibGF5ZXIiICAgICBpZD0ibGF5ZXIxIiAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtMTAzMi4zNjIyKSI+ICAgIDxwYXRoICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiICAgICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7dmlzaWJpbGl0eTp2aXNpYmxlO2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MC41O21hcmtlcjpub25lO2VuYWJsZS1iYWNrZ3JvdW5kOmFjY3VtdWxhdGUiICAgICAgIGQ9Im0gNSwxMDM5LjM2MjIgMCw2IDIsMiA2LDAgMiwtMiAwLC02IC0yLC0yIC02LDAgeiBtIDMsMCA0LDAgMSwxIDAsNCAtMSwxIC00LDAgLTEsLTEgMCwtNCB6IiAgICAgICBpZD0icmVjdDc3OTciICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0iY2NjY2NjY2NjY2NjY2NjY2NjIiAvPiAgICA8Y2lyY2xlICAgICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7dmlzaWJpbGl0eTp2aXNpYmxlO2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS42MDAwMDAwMjttYXJrZXI6bm9uZTtlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIiAgICAgICBpZD0icGF0aDQzNjQiICAgICAgIGN4PSI2IiAgICAgICBjeT0iMTA0Ni4zNjIyIiAgICAgICByPSIyIiAvPiAgICA8Y2lyY2xlICAgICAgIGlkPSJwYXRoNDM2OCIgICAgICAgc3R5bGU9ImNvbG9yOiMwMDAwMDA7ZGlzcGxheTppbmxpbmU7b3ZlcmZsb3c6dmlzaWJsZTt2aXNpYmlsaXR5OnZpc2libGU7ZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoxLjYwMDAwMDAyO21hcmtlcjpub25lO2VuYWJsZS1iYWNrZ3JvdW5kOmFjY3VtdWxhdGUiICAgICAgIGN4PSIxNCIgICAgICAgY3k9IjEwNDYuMzYyMiIgICAgICAgcj0iMiIgLz4gICAgPGNpcmNsZSAgICAgICBpZD0icGF0aDQzNzAiICAgICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7dmlzaWJpbGl0eTp2aXNpYmxlO2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS42MDAwMDAwMjttYXJrZXI6bm9uZTtlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIiAgICAgICBjeD0iNiIgICAgICAgY3k9IjEwMzguMzYyMiIgICAgICAgcj0iMiIgLz4gICAgPGNpcmNsZSAgICAgICBzdHlsZT0iY29sb3I6IzAwMDAwMDtkaXNwbGF5OmlubGluZTtvdmVyZmxvdzp2aXNpYmxlO3Zpc2liaWxpdHk6dmlzaWJsZTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuNjAwMDAwMDI7bWFya2VyOm5vbmU7ZW5hYmxlLWJhY2tncm91bmQ6YWNjdW11bGF0ZSIgICAgICAgaWQ9InBhdGg0MzcyIiAgICAgICBjeD0iMTQiICAgICAgIGN5PSIxMDM4LjM2MjIiICAgICAgIHI9IjIiIC8+ICA8L2c+PC9zdmc+)";
rectButton.onclick = () => {
  draw.changeMode("draw_assisted_rectangle");
  if (condition.toggleScaleRotate === true) {
    toggleGeoreference();
  }
};
drawContainer.insertBefore(rectButton, pointDraw);
/////CIRCLES
var circleButton = document.createElement("button");
circleButton.className = "mapbox-gl-draw_ctrl-draw-btn";
circleButton.title = "Circle tool";
circleButton.style.backgroundSize = "20px";
circleButton.style.backgroundImage =
  "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAyMCAyMCIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMjAgMjAiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MjtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9Cjwvc3R5bGU+Cgo8Y2lyY2xlIGNsYXNzPSJzdDAiIGN4PSIxMCIgY3k9IjEwIiByPSI2Ii8+Cjwvc3ZnPgo=)";
circleButton.onclick = () => {
  draw.changeMode("draw_circle", { initialRadiusInKm: 0.02 });
  if (condition.toggleScaleRotate === true) {
    toggleGeoreference();
  }
};
drawContainer.insertBefore(circleButton, pointDraw);

var splitLineButton = document.createElement("button");
splitLineButton.className = "mapbox-gl-draw_ctrl-draw-btn";
splitLineButton.title = "Split LineString";
splitLineButton.style.backgroundImage =
  "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNC4xLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIg0KCSBpZD0ic3ZnMTkxNjciIGlua3NjYXBlOnZlcnNpb249IjAuOTErZGV2ZWwrb3N4bWVudSByMTI5MTEiIHNvZGlwb2RpOmRvY25hbWU9InNxdWFyZS5zdmciIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIiB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIg0KCSB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjIwcHgiIGhlaWdodD0iMjBweCINCgkgdmlld0JveD0iMCAwIDIwIDIwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyMCAyMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHNvZGlwb2RpOm5hbWVkdmlldyAgYm9yZGVyY29sb3I9IiM2NjY2NjYiIGJvcmRlcm9wYWNpdHk9IjEuMCIgaWQ9ImJhc2UiIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9ImxheWVyMSIgaW5rc2NhcGU6Y3g9IjExLjY4MTYzNCIgaW5rc2NhcGU6Y3k9IjkuMjg1NzE0MyIgaW5rc2NhcGU6ZG9jdW1lbnQtdW5pdHM9InB4IiBpbmtzY2FwZTpvYmplY3Qtbm9kZXM9InRydWUiIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijc1MSIgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMjgwIiBpbmtzY2FwZTp3aW5kb3cteD0iMCIgaW5rc2NhcGU6d2luZG93LXk9IjIzIiBpbmtzY2FwZTp6b29tPSIxMS4zMTM3MDgiIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIgc2hvd2dyaWQ9InRydWUiIHVuaXRzPSJweCI+DQoJPGlua3NjYXBlOmdyaWQgIGlkPSJncmlkMTk3MTUiIHR5cGU9Inh5Z3JpZCI+PC9pbmtzY2FwZTpncmlkPg0KPC9zb2RpcG9kaTpuYW1lZHZpZXc+DQo8cGF0aCBkPSJNMTAuNSwxNGwxLjktMC44bDAuOCwyLjFMMTEuMywxNkwxMC41LDE0eiBNOS4zLDEwLjlsMS45LTAuN2wwLjgsMi4xTDEwLjEsMTNMOS4zLDEwLjl6IE04LDcuOGwxLjktMC43bDAuOCwyLjFMOC45LDkuOQ0KCUw4LDcuOHogTTYuOSw0LjdMOC44LDRsMC44LDIuMUw3LjcsNi44TDYuOSw0Ljd6Ii8+DQo8cGF0aCBkPSJNNi41LDExYzAuMywwLDAuNiwwLDAuOSwwLjJsMS0xbDAuOCwybC0wLjQsMC40QzksMTIuOSw5LDEzLjIsOSwxMy41QzksMTQuOSw3LjksMTYsNi41LDE2UzQsMTQuOSw0LDEzLjVTNS4xLDExLDYuNSwxMXoiDQoJLz4NCjxwYXRoIGQ9Ik0xMS42LDkuOWwtMC44LTJsMC40LTAuNEMxMSw3LjEsMTEsNi44LDExLDYuNUMxMSw1LjEsMTIuMSw0LDEzLjUsNFMxNiw1LjEsMTYsNi41UzE0LjksOSwxMy41LDljLTAuMywwLTAuNiwwLTAuOS0wLjINCglMMTEuNiw5Ljl6Ii8+DQo8L3N2Zz4NCg==)";
splitLineButton.onclick = () => {
  draw.changeMode("cut_line");
};
drawContainer.insertBefore(splitLineButton, polyButton);

var splitButton = document.createElement("button");
splitButton.className = "mapbox-gl-draw_ctrl-draw-btn";
splitButton.title = "Split polygon";
splitButton.style.backgroundImage =
  "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNC4xLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIg0KCSBpZD0ic3ZnMTkxNjciIGlua3NjYXBlOnZlcnNpb249IjAuOTErZGV2ZWwrb3N4bWVudSByMTI5MTEiIHNvZGlwb2RpOmRvY25hbWU9InNxdWFyZS5zdmciIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIiB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIg0KCSB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDIwIDIwIg0KCSBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyMCAyMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHNvZGlwb2RpOm5hbWVkdmlldyAgYm9yZGVyY29sb3I9IiM2NjY2NjYiIGJvcmRlcm9wYWNpdHk9IjEuMCIgaWQ9ImJhc2UiIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9ImxheWVyMSIgaW5rc2NhcGU6Y3g9IjExLjY4MTYzNCIgaW5rc2NhcGU6Y3k9IjkuMjg1NzE0MyIgaW5rc2NhcGU6ZG9jdW1lbnQtdW5pdHM9InB4IiBpbmtzY2FwZTpvYmplY3Qtbm9kZXM9InRydWUiIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijc1MSIgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMjgwIiBpbmtzY2FwZTp3aW5kb3cteD0iMCIgaW5rc2NhcGU6d2luZG93LXk9IjIzIiBpbmtzY2FwZTp6b29tPSIxMS4zMTM3MDgiIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIgc2hvd2dyaWQ9InRydWUiIHVuaXRzPSJweCI+DQoJPGlua3NjYXBlOmdyaWQgIGlkPSJncmlkMTk3MTUiIHR5cGU9Inh5Z3JpZCI+PC9pbmtzY2FwZTpncmlkPg0KPC9zb2RpcG9kaTpuYW1lZHZpZXc+DQo8cGF0aCBkPSJNOC43LDE2bC0xLjktMC43bDAuOC0yLjFMOS41LDE0TDguNywxNnogTTkuOSwxM2wtMS45LTAuN2wwLjgtMi4xbDEuOSwwLjdMOS45LDEzeiBNMTEuMSw5LjlMOS4zLDkuMmwwLjgtMi4xbDEuOSwwLjcNCglMMTEuMSw5Ljl6IE0xMi4zLDYuOGwtMS45LTAuN0wxMS4yLDRsMS45LDAuN0wxMi4zLDYuOHoiLz4NCjxnPg0KCTxwb2x5Z29uIHBvaW50cz0iNywxMyA3LDcgOS42LDcgMTAuMyw1IDUsNSA1LDE1IDYuNSwxNSAJIi8+DQoJPHBvbHlnb24gcG9pbnRzPSIxMy41LDUgMTMsNyAxMywxMyAxMC40LDEzIDkuNywxNSAxNSwxNSAxNSw1IAkiLz4NCjwvZz4NCjwvc3ZnPg0K)";
splitButton.onclick = () => {
  try {
    draw.changeMode("splitPolygonMode");
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
};

drawContainer.appendChild(splitButton);

function mergePolygons() {
  const sel = draw
    .getSelected()
    .features.filter(
      (feature) =>
        feature.geometry.type == "Polygon" ||
        feature.geometry.type == "MultiPolygon"
    );
  if (sel.length > 1) {
    sel.forEach((element) => {
      draw.delete(element.id);
    });
    var poly1 = sel[0];
    for (var i = 1; i < sel.length; i++) {
      var poly2 = turf.union(poly1, sel[i]);
      poly1 = poly2;
    }
    draw.add(poly1);
  } else {
    alert("Нужно выбрать 2 полигона");
  }
}

function offsetPolygons() {
  const sel = draw
    .getSelected()
    .features.filter(
      (feature) =>
        feature.geometry.type == "Polygon" ||
        feature.geometry.type == "MultiPolygon"
    );
  if (sel.length > 0) {
    let offset = prompt("Параллельный контур, м", -15);
    sel.forEach((element) => {
      let props = element.properties;
      draw.delete(element.id);
      var buffered = turf.buffer(element, offset, {
        units: "meters",
        steps: 2
      });
      var difference = turf.difference(element, buffered);
      if (difference) {
        difference.properties = props;
        draw.add(difference);
      }
    });
  } else {
    alert("Нужно выбрать полигон");
  }
}

var mergeButton = document.createElement("button");
mergeButton.className = "mapbox-gl-draw_ctrl-draw-btn";
mergeButton.title = "Merge polygons";
mergeButton.style.backgroundImage =
  "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNC4xLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIg0KCSBpZD0ic3ZnMTkxNjciIGlua3NjYXBlOnZlcnNpb249IjAuOTErZGV2ZWwrb3N4bWVudSByMTI5MTEiIHNvZGlwb2RpOmRvY25hbWU9InNxdWFyZS5zdmciIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIiB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIg0KCSB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjIwcHgiIGhlaWdodD0iMjBweCINCgkgdmlld0JveD0iMCAwIDIwIDIwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyMCAyMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHNvZGlwb2RpOm5hbWVkdmlldyAgYm9yZGVyY29sb3I9IiM2NjY2NjYiIGJvcmRlcm9wYWNpdHk9IjEuMCIgaWQ9ImJhc2UiIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9ImxheWVyMSIgaW5rc2NhcGU6Y3g9IjExLjY4MTYzNCIgaW5rc2NhcGU6Y3k9IjkuMjg1NzE0MyIgaW5rc2NhcGU6ZG9jdW1lbnQtdW5pdHM9InB4IiBpbmtzY2FwZTpvYmplY3Qtbm9kZXM9InRydWUiIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijc1MSIgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMjgwIiBpbmtzY2FwZTp3aW5kb3cteD0iMCIgaW5rc2NhcGU6d2luZG93LXk9IjIzIiBpbmtzY2FwZTp6b29tPSIxMS4zMTM3MDgiIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIgc2hvd2dyaWQ9InRydWUiIHVuaXRzPSJweCI+DQoJPGlua3NjYXBlOmdyaWQgIGlkPSJncmlkMTk3MTUiIHR5cGU9Inh5Z3JpZCI+PC9pbmtzY2FwZTpncmlkPg0KPC9zb2RpcG9kaTpuYW1lZHZpZXc+DQo8cGF0aCBkPSJNMTIsOFY1SDV2N2gzdjNoN1Y4SDEyeiBNOSw3YzAsMCw0LDQsNCw0bC0yLDJMNyw5TDksN3oiLz4NCjwvc3ZnPg0K)";
mergeButton.onclick = mergePolygons;
drawContainer.appendChild(mergeButton);

function addShift(e, layer) {
  if (e.originalEvent.ctrlKey == true) {
    if (tempPolyData.features[0].id) {
      let likeForReal = confirm("Забираем дорогу?");
      if (likeForReal) {
        var feature = JSON.parse(
          JSON.stringify(
            pathPolyRoadData.features.filter(function (item) {
              return item.properties.id == tempPolyData.features[0].id;
            })
          )
        );

        cleanGeojsonRoad(tempPolyData.features[0].id);
        map.getSource("pathPolyRoadSource").setData(pathPolyRoadData);
        draw.delete(tempPolyData.features[0].id);
        draw.add(feature[0]);
      }
    } else {
      tempPolyData.features[0].id = [
        ...crypto.getRandomValues(new Uint8Array(20))
      ]
        .map((m) => ("0" + m.toString(16)).slice(-2))
        .join("");
      tempPolyData.id = tempPolyData.features[0].id;

      draw.add(tempPolyData.features[0]);
    }
    draw.setFeatureProperty(tempPolyData.features[0].id, "color", colorDraw);
    draw.setFeatureProperty(tempPolyData.features[0].id, "width", widthDraw);
    draw.setFeatureProperty(
      tempPolyData.features[0].id,
      "dash",
      dashes[dashDraw]
    );
    //draw.setFeatureProperty(id, "arrow", arrowState);
    draw.setFeatureProperty(
      tempPolyData.features[0].id,
      "opacity",
      drawOpacity
    );
    /*var feature = map.queryRenderedFeatures(e.point, { layers: [layer] });
    delete feature[0].id;
    draw.add(feature[0]);*/
  } else if (e.originalEvent.altKey == true) {
    var layerId = tempPolyData.features[0].layer.id;
    var id = tempPolyData.features[0].id;
    console.log(id);
    var currFilter = map.getFilter(layerId);
    var newFilter;

    var filterPart = ["match", ["id"], [id], false, true];

    if (currFilter[0] !== "all") {
      newFilter = ["all", currFilter, filterPart];
      map.setFilter(layerId, newFilter);
    } else {
      currFilter.push(filterPart);
      map.setFilter(layerId, currFilter);
    }

    /*[
    "match",
    ["id"],
    [641607540805479],
    false,
    true
  ]*/
  }
}

function hoverShift(e, layer) {
  if (e.originalEvent.ctrlKey == true) {
    var feature = map.queryRenderedFeatures(e.point, { layers: [layer] });
    if (feature[0].source !== "pathPolyRoadSource") {
      delete feature[0].id;
      delete feature[0].properties.id;
    } else {
      feature[0].id = feature[0].properties.id;
    }
    tempPolyData.features = [feature[0]];
    map.getSource("tempPolySource").setData(tempPolyData);
  } else if (e.originalEvent.altKey == true && condition.toggleMove == false) {
    var feature = map.queryRenderedFeatures(e.point, { layers: [layer] });
    tempPolyData.features = [feature[0]];
    map.getSource("tempPolySource").setData(tempPolyData);
  }
}

map.on("mousemove", (e) => {
  if (e.originalEvent.ctrlKey !== true && tempPolyData.features.length > 0) {
    tempPolyData.features = [];
    map.getSource("tempPolySource").setData(tempPolyData);
  }
});

pickableLayers.forEach((element) => {
  map.on("mousemove", element, (e) => {
    hoverShift(e, element);
  });
});

map.on("click", "tempPoly", (e) => {
  addShift(e);
});

document.addEventListener("keydown", function (event) {
  if (event.code == "KeyZ" && (event.ctrlKey || event.metaKey)) {
    console.log("BACK");
    if (pastFeatures.length > 0) {
      pastFeatures.forEach((feature) => {
        draw.delete(feature.id);
        draw.add(feature);
      });
    }
  }
});

const tpuTune = document.querySelector("#tpuText");
tpuTune.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (!document.querySelector("#tpuRangeRange")) {
    document.querySelectorAll(`.tasks__item`).forEach((task) => {
      task.classList.remove("tuning");
    });
    document.querySelectorAll(`.layersTune`).forEach((tune) => {
      tune.remove();
    });
    tpuTune.parentElement.classList.add("tuning");

    document.querySelectorAll(`.liTune`).forEach((tune) => {
      tune.classList.remove("active");
    });

    tpuTune.classList.add("active");
    var tpuRange = document.createElement("input");
    tpuRange.type = "range";
    tpuRange.id = "tpuRangeRange";
    tpuRange.className = "layersTune";
    tpuRange.min = 0;
    tpuRange.title = "Подпись станций";
    tpuRange.max = 2;
    tpuRange.step = 1;
    tpuRange.value = 2;
    tpuRange.addEventListener("input", () => {
      const tpuStyleNum = parseFloat(tpuRange.value);
      if (tpuStyleNum == 0) {
        map.setLayoutProperty("tpu", "text-field", tpuStyles.styleEmpty);
      } else if (tpuStyleNum == 1) {
        map.setLayoutProperty("tpu", "text-field", tpuStyles.styleHours);
      } else if (tpuStyleNum == 2) {
        map.setLayoutProperty("tpu", "text-field", tpuStyles.styleDays);
      }
    });
    layersDOM.appendChild(tpuRange);
  } else {
    tpuTune.parentElement.classList.remove("tuning");
    tpuTune.classList.remove("active");
    document.querySelector("#tpuRangeRange").remove();
  }
});

const metroTune = document.querySelector("#metroLine");
metroTune.addEventListener("contextmenu", (e) => {
  //metroTune.parentElement.classList.toggle("tuning");
  e.preventDefault();

  if (!document.querySelector("#metroLineRange")) {
    document.querySelectorAll(`.tasks__item`).forEach((task) => {
      task.classList.remove("tuning");
    });
    document.querySelectorAll(`.layersTune`).forEach((tune) => {
      tune.remove();
    });
    metroTune.parentElement.classList.add("tuning");

    document.querySelectorAll(`.liTune`).forEach((tune) => {
      tune.classList.remove("active");
    });
    metroTune.classList.add("active");
    var metroRange = document.createElement("input");
    metroRange.type = "range";
    metroRange.id = "metroLineRange";
    metroRange.className = "layersTune";
    metroRange.min = 0.4;
    metroRange.title = "Толщина линий";
    metroRange.max = 1.6;
    metroRange.step = 0.2;
    metroRange.value = 1;
    metroRange.addEventListener("input", () => {
      metroLineMagnifier = parseFloat(metroRange.value);
      map.setPaintProperty("metroLine", "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        ["*", metroLineMagnifier, 2], //2
        13,
        ["*", metroLineMagnifier, 6], //6
        14,
        ["*", metroLineMagnifier, 2],
        20,
        ["*", metroLineMagnifier, 6]
      ]);
      map.setPaintProperty("metroLine", "line-gap-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        13.5,
        0,
        14,
        ["*", metroLineMagnifier, 4], //4,
        19,
        ["*", metroLineMagnifier, 20] //20
      ]);
      map.setPaintProperty("metroLineWhite", "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        ["*", metroLineMagnifier, 6], //6
        13,
        ["*", metroLineMagnifier, 14], //14,
        14,
        ["*", metroLineMagnifier, 4], //4,
        20,
        ["*", metroLineMagnifier, 10] //10
      ]);
      map.setPaintProperty("metroLineWhite", "line-gap-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        13.5,
        0,
        14,
        ["*", metroLineMagnifier, 6], //6,
        19,
        ["*", metroLineMagnifier, 24] //24
      ]);
      map.setPaintProperty("metroLineWhite", "line-blur", [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        ["*", metroLineMagnifier, 4], //4,
        13,
        ["*", metroLineMagnifier, 8], //8,
        14,
        ["*", metroLineMagnifier, 4], //4,
        20,
        ["*", metroLineMagnifier, 8] //8
      ]);
      map.setPaintProperty("metroLine-constructing", "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        ["*", metroLineMagnifier, 2], //2
        13,
        ["*", metroLineMagnifier, 6], //6
        14,
        ["*", metroLineMagnifier, 2],
        20,
        ["*", metroLineMagnifier, 6]
      ]);
      map.setPaintProperty("metroLine-constructing", "line-gap-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        13.5,
        0,
        14,
        ["*", metroLineMagnifier, 4], //4,
        19,
        ["*", metroLineMagnifier, 20] //20
      ]);
      map.setPaintProperty("MCC-red", "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        ["*", metroLineMagnifier, 10], //10,
        14,
        ["*", metroLineMagnifier, 14] //14
      ]);
      map.setPaintProperty("MCC-red", "line-blur", [
        "*",
        metroLineMagnifier,
        6
      ]);
      map.setPaintProperty("MCC-white", "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        ["*", metroLineMagnifier, 3], //3,
        14,
        ["*", metroLineMagnifier, 6] // 6
      ]);
    });

    layersDOM.appendChild(metroRange);
  } else {
    metroTune.parentElement.classList.remove("tuning");
    metroTune.classList.remove("active");
    document.querySelector("#metroLineRange").remove();
  }
});

const satTune = document.querySelector("#satTune");
satTune.addEventListener("contextmenu", (e) => {
  e.preventDefault();

  if (!document.querySelector("#satRange")) {
    document.querySelectorAll(`.tasks__item`).forEach((task) => {
      task.classList.remove("tuning");
    });
    document.querySelectorAll(`.layersTune`).forEach((tune) => {
      tune.remove();
    });
    satTune.parentElement.classList.add("tuning");

    document.querySelectorAll(`.liTune`).forEach((tune) => {
      tune.classList.remove("active");
    });
    satTune.classList.add("active");
    var satRange = document.createElement("input");
    satRange.type = "range";
    satRange.id = "satRange";
    satRange.className = "layersTune";
    satRange.title = "Прозрачность слоя";
    satRange.min = 0.1;
    satRange.max = 1;
    satRange.step = 0.05;
    satRange.value = condition.satOpacity;
    satRange.addEventListener("input", () => {
      condition.satOpacity = parseFloat(satRange.value);
      map.setPaintProperty("sat", "raster-opacity", condition.satOpacity);
    });
    layersDOM.appendChild(satRange);
  } else {
    satTune.parentElement.classList.remove("tuning");
    satTune.classList.remove("active");
    document.querySelector("#satRange").remove();
  }
});

const udsConstrTune = document.querySelector("#udsConstrTune");
udsConstrTune.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  var layersConstr = udsConstrTune.parentElement
    .getAttribute("data")
    .split(",");
  //roads-aip,roads-aip-bridge,bridges-constructing
  if (!document.querySelector("#udsConstrRange")) {
    document.querySelectorAll(`.tasks__item`).forEach((task) => {
      task.classList.remove("tuning");
    });
    document.querySelectorAll(`.layersTune`).forEach((tune) => {
      tune.remove();
    });
    udsConstrTune.parentElement.classList.add("tuning");

    document.querySelectorAll(`.liTune`).forEach((tune) => {
      tune.classList.remove("active");
    });
    udsConstrTune.classList.add("active");
    var udsConstrRange = document.createElement("input");
    udsConstrRange.type = "range";
    udsConstrRange.id = "udsConstrRange";
    udsConstrRange.title = "Насыщенность штриховки";
    udsConstrRange.className = "layersTune";
    udsConstrRange.min = 0;
    udsConstrRange.max = 3;
    udsConstrRange.step = 1;
    udsConstrRange.value = condition.udsConstrPattern;
    udsConstrRange.addEventListener("input", () => {
      if (parseInt(udsConstrRange.value) == 1) {
        condition.udsConstrPattern = 1;
        newBridgeColor = [196, 207, 207, 200];

        layersConstr.forEach((layer) => {
          map.setPaintProperty(layer, "fill-pattern", "blue-stripes");
        });
      } else if (parseInt(udsConstrRange.value) == 2) {
        condition.udsConstrPattern = 2;

        newBridgeColor = [168, 184, 183, 200];

        layersConstr.forEach((layer) => {
          map.setPaintProperty(layer, "fill-pattern", "blue-stripes-heavy");
        });
      } else if (parseInt(udsConstrRange.value) == 3) {
        condition.udsConstrPattern = 3;

        newBridgeColor = [132, 162, 159, 200];

        layersConstr.forEach((layer) => {
          map.setPaintProperty(
            layer,
            "fill-pattern",
            "blue-stripes-superheavy"
          );
        });
      } else {
        condition.udsConstrPattern = 0;

        newBridgeColor = [255, 255, 255, 200];

        layersConstr.forEach((layer) => {
          map.setPaintProperty(layer, "fill-pattern", "blue-stripes-lite");
        });
      }
    });
    layersDOM.appendChild(udsConstrRange);
  } else {
    udsConstrTune.parentElement.classList.remove("tuning");
    udsConstrTune.classList.remove("active");
    document.querySelector("#udsConstrRange").remove();
  }
});
////////////////////////////
////////////////////////////
//BRIDGES
function mergePolygonsBack(data) {
  if (data.features.length > 1) {
    var poly1 = data.features[0];
    for (var i = 1; i < data.features.length; i++) {
      var poly2 = turf.union(poly1, data.features[i]);
      poly1 = poly2;
    }
    return [poly1];
  } else {
    return data.features;
  }
}
function bufferLine(line, width) {
  var buffered = turf.buffer(line, width / 2, { units: "meters", steps: 1 });
  var segments = turf.lineSegment(line);
  var bearing1 =
    turf.bearing(
      segments.features[0].geometry.coordinates[0],
      segments.features[0].geometry.coordinates[1]
    ) - 180;
  var bearing2 = turf.bearing(
    segments.features[segments.features.length - 1].geometry.coordinates[0],
    segments.features[segments.features.length - 1].geometry.coordinates[1]
  );

  var translated1 = turf.transformTranslate(
    turf.point(segments.features[0].geometry.coordinates[0]),
    width / 2,
    bearing1,
    { units: "meters" }
  );
  var translated2 = turf.transformTranslate(
    turf.point(
      segments.features[segments.features.length - 1].geometry.coordinates[1]
    ),
    width / 2,
    bearing2,
    { units: "meters" }
  );

  var coef = 6;
  var coord1 = [
    translated1.geometry.coordinates[0].toFixed(coef),
    translated1.geometry.coordinates[1].toFixed(coef)
  ];
  var coord2 = [
    translated2.geometry.coordinates[0].toFixed(coef),
    translated2.geometry.coordinates[1].toFixed(coef)
  ];
  for (var i = 0; i < buffered.geometry.coordinates[0].length; i++) {
    var x = buffered.geometry.coordinates[0][i][0].toFixed(coef);
    var y = buffered.geometry.coordinates[0][i][1].toFixed(coef);

    if (
      (x == coord1[0] && y == coord1[1]) ||
      (x == coord2[0] && y == coord2[1])
    ) {
      buffered.geometry.coordinates[0].splice(i, 1);
      i--;
    }
  }
  return buffered;
}

function createRoad(geo) {
  var curvedPath = roundCorners(geo, condition.bridgeMaxRadius);

  var road = bufferLine(curvedPath, condition.bridgeWidth);
  road.properties = JSON.parse(JSON.stringify(geo.properties));
  road.properties.id = geo.id;
  pathPolyRoadData.features.push(road);
  map.getSource("pathPolyRoadSource").setData(pathPolyRoadData);
}

function createBridge(geo) {
  var curvedPath = roundCorners(geo, condition.bridgeMaxRadius);
  add3d(curvedPath, condition.bridgeWidth / 2, condition.bridgeHeight).forEach(
    (element) => {
      pathPolyData.features.push(element);
    }
  );

  var shadow = bufferLine(curvedPath, condition.bridgeWidth);
  shadow.properties.id = geo.id;
  pathPolyShadowData.features.push(shadow);
  pathPolyShadowDataMerged.features = mergePolygonsBack(pathPolyShadowData);

  map.getSource("pathPolySource").setData(pathPolyData);
  // map.getSource("pathPolyShadowSource").setData(pathPolyShadowData);
  map.getSource("pathPolyShadowSource").setData(pathPolyShadowDataMerged);
}

function cleanGeojsonBridge(id) {
  pathPolyData.features = pathPolyData.features.filter(function (item) {
    return item.properties.id !== id;
  });
  pathPolyShadowData.features = pathPolyShadowData.features.filter(function (
    item
  ) {
    return item.properties.id !== id;
  });
}

function cleanGeojsonRoad(id) {
  pathPolyRoadData.features = pathPolyRoadData.features.filter(function (item) {
    return item.properties.id !== id;
  });
}

function add3d(feature, radius, maxHeight) {
  var length = turf.length(feature, { units: "meters" });
  if (maxHeight * 4 > length) {
    maxHeight = length / 4;
  }

  var circles = [];
  for (var i = 0; i < length; i += radius / condition.bridgeStepSize) {
    var height;
    if (condition.bridgeType == "full") {
      if (length < maxHeight * 20) {
        var percent = Math.sin((i / length) * Math.PI);
        height = percent * maxHeight;
      } else {
        if (i < maxHeight * 10) {
          height = i / 10;
        } else if (length - i < maxHeight * 10) {
          height = (length - i) / 10;
        } else {
          height = maxHeight;
        }
      }
    } else if (condition.bridgeType == "left") {
      if (length < maxHeight * 20) {
        var percent = Math.sin((i / length / 2) * Math.PI);
        height = percent * maxHeight;
      } else {
        if (i < maxHeight * 10) {
          height = i / 10;
        } else {
          height = maxHeight;
        }
      }
    } else {
      if (length < maxHeight * 20) {
        var percent = Math.cos((i / length / 2) * Math.PI);
        height = percent * maxHeight;
      } else {
        if (length - i < maxHeight * 10) {
          height = (length - i) / 10;
        } else {
          height = maxHeight;
        }
      }
    }

    var id;
    if (feature.id) {
      id = feature.id;
    } else {
      id = feature.properties.id;
    }
    var center = turf.along(feature, i, { units: "meters" });
    var options = {
      steps: condition.bridgeQuality,
      units: "meters",
      properties: {
        height: height,
        base: height - 2,
        id: id,
        color: colorDraw
      }
    };
    var circle = turf.circle(center, radius, options);
    //rotate circle
    var i2 = (i += radius / condition.bridgeStepSize);
    var pt2 = turf.along(feature, i2, { units: "meters" });

    if (!pt2) {
      pt2 = turf.along(feature, (i -= radius / condition.bridgeStepSize), {
        units: "meters"
      });
    }
    var bearing = turf.bearing(center, pt2);
    //

    var rotatedCircle = turf.transformRotate(circle, bearing);
    circles.push(rotatedCircle);
    //Pilons
    var newRadius = radius / 3;
    if (radius / 3 > 2) {
      newRadius = 2;
    }
    if (parseInt(i) % 24 == 0) {
      var optionsPilon = {
        steps: condition.bridgeQuality / 2,
        units: "meters",
        properties: {
          height: height,
          id: id,
          color: colorDraw
        }
      };
      var pilon = turf.circle(center, newRadius, optionsPilon);
      circles.push(pilon);
    }
  }
  return circles;
}
/*
function roundCorners(line, offset) {
  if (line.geometry.coordinates.length == 2) {
    return line;
  } else {
    var segments = turf.lineSegment(line);
    var steps = 32;
    var bearings = [];
    var trans = [];

    for (var i = 0; i < segments.features.length; i++) {
      var length = turf.length(segments.features[i], { units: "meters" });

      if (length / 3 < offset) {
        offset = length / 3;
      }
    }
    for (i = 0; i < segments.features.length; i++) {
      bearings.push(
        turf.bearing(
          segments.features[i].geometry.coordinates[0],
          segments.features[i].geometry.coordinates[1]
        )
      );
      var translated1 = turf.transformTranslate(
        segments.features[i],
        offset,
        bearings[i] + 90,
        { units: "meters" }
      );
      var translated2 = turf.transformTranslate(
        segments.features[i],
        offset,
        bearings[i] - 90,
        { units: "meters" }
      );
      trans.push(translated1);
      trans.push(translated2);
    }
    var bCount = 0;
    var arx = [];
    for (var a = 0; a < trans.length - 3; a += 2) {
      var arc;
      var intersects1 = turf.lineIntersect(trans[a], trans[a + 2]);
      var intersects2 = turf.lineIntersect(trans[a + 1], trans[a + 3]);
      if (intersects1.features.length > 0) {
        var centre = intersects1.features[0].geometry.coordinates;
        arc = turf.lineArc(
          centre,
          offset,
          bearings[bCount] - 90,
          bearings[bCount + 1] - 90,
          {
            units: "meters",
            steps: steps
          }
        );
      }
      if (intersects2.features.length > 0) {
        var centre = intersects2.features[0].geometry.coordinates;
        arc = turf.rewind(
          turf.lineArc(
            centre,
            offset,
            bearings[bCount + 1] + 90,
            bearings[bCount] + 90,

            {
              units: "meters",
              steps: steps
            }
          )
        );
      }
      arx.push(arc);
      bCount++;
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
        //arc = turf.rewind(arc);
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

      //part.properties.id = line.id;
      //bezierData.features.push(part);
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
    //bezierData.features.push(finFeature);
    // map.getSource("bezierSource").setData(bezierData);
  }
}

*/
/*
function roundCorners(line, maxOffset) {
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

*/
map.on("click", "extrudedPathPoly", (e) => {
  if (draw.getMode() == "simple_select") {
    let features = map.queryRenderedFeatures(e.point, {
      layers: ["extrudedPathPoly"]
    });
    var currId = features[0].properties.id;
    var currSelected = draw.getSelectedIds();

    for (var i = 0; i < currSelected.length; i++) {
      if (currSelected[i] == currId) {
        return;
      }
    }

    draw.changeMode(`simple_select`, { featureIds: [currId] });
  }
});

map.on("click", "pathRoadPoly", (e) => {
  if (draw.getMode() == "simple_select") {
    let features = map.queryRenderedFeatures(e.point, {
      layers: ["pathRoadPoly"]
    });
    var currId = features[0].properties.id;
    var currSelected = draw.getSelectedIds();

    for (var i = 0; i < currSelected.length; i++) {
      if (currSelected[i] == currId) {
        return;
      }
    }

    draw.changeMode(`simple_select`, { featureIds: [currId] });
  }
});

map.on("mouseenter", "extrudedPathPoly", function () {
  map.getCanvas().style.cursor = "pointer";
});

map.on("mouseleave", "extrudedPathPoly", function () {
  map.getCanvas().style.cursor = "";
});
map.on("mouseenter", "pathRoadPoly", function () {
  map.getCanvas().style.cursor = "pointer";
});

map.on("mouseleave", "pathRoadPoly", function () {
  map.getCanvas().style.cursor = "";
});

//////////////////
////////////////////
//service
///////////////////
/////////////////
var hidePaletteButton = document.querySelector("#hidePalette");
var palette = document.querySelector("#palette");
var drawContainer = document.getElementsByClassName(
  "mapboxgl-ctrl-group mapboxgl-ctrl"
)[0];
hidePaletteButton.style.height = drawContainer.clientHeight + "px";
function paletteHider() {
  if (palette.style.marginRight == "0px") {
    condition.palette = false;
    palette.style.marginRight = "-140px";
    palette.style.opacity = 0;
    hidePaletteButton.style.marginRight = "-140px";
    hidePaletteButton.children[0].style.transform = "rotate(0deg)";
  } else {
    condition.palette = true;
    palette.style.marginRight = "0px";
    palette.style.opacity = 1;
    hidePaletteButton.style.marginRight = "0px";
    hidePaletteButton.children[0].style.transform = "rotate(180deg)";
  }
}
hidePaletteButton.onclick = (e) => paletteHider();
////COLOR
function colorUnfold() {
  var colorContainer = document.getElementById("colorPalette");
  for (var i = 0; i < colors.length; i++) {
    var btn = document.createElement("BUTTON"); // Create a <button> element
    btn.className = "colorButton";
    if (colors[i] == colorDraw) {
      btn.classList.add("active");
    }
    btn.style.background = colors[i]; // Insert text
    btn.addEventListener("click", (e) => setColor(e));
    if (colors[i] == "#ffffff" || colors[i] == "#fff") {
      btn.style.boxShadow = "#aaa 0px 0px 5px inset";
    }
    colorContainer.appendChild(btn);
  }
}
colorUnfold();
////WIDTH
function setWidth(value) {
  if (typeof value == "number") {
    widthDraw = value;
    document.querySelector("#widthRangeLabel").innerHTML = widthDraw;
    document.getElementById("widthRange").value = widthDraw;

    if (selectedIds.length > 0) {
      for (var o = 0; o < selectedIds.length; o++) {
        var currId = selectedIds[o].id;

        var type = selectedIds[o].geometry.type;
        if (type == "LineString") {
          if (widthDraw == 0 && selectedIds[o].properties.bridge !== true) {
            widthDraw = 1;
            document.getElementById("widthRange").value = widthDraw;
            document.getElementById("widthRangeLabel").innerHTML = widthDraw;
          }
          for (var i = 0; i < geojsonArrow.features.length; i++) {
            draw.setFeatureProperty(currId, "width", widthDraw);
            if (geojsonArrow.features[i].properties.id === currId) {
              geojsonArrow.features[i].properties.size = 0.1 + widthDraw / 10;
              map.getSource("arrowSource").setData(geojsonArrow);
            }
          }
        } else if (type == "Point") {
          if (widthDraw == 0) {
            widthDraw = 1;
            document.getElementById("widthRange").value = widthDraw;
            document.getElementById("widthRangeLabel").innerHTML = widthDraw;
          }
          draw.setFeatureProperty(currId, "width", widthDraw * 3);
        } else {
          draw.setFeatureProperty(currId, "width", widthDraw);
        }
      }
    }
  }
}
document.querySelector("#widthRange").oninput = (e) => {
  var currWidth = parseInt(document.getElementById("widthRange").value, 10);
  setWidth(currWidth);
};
////OPACITY
var opacitySelector = document.querySelector("#opacityRange");
var opacitySelectorLabel = document.querySelector("#opacityRangeLabel");

function setOpacity(opacity) {
  drawOpacity = opacity;
  opacitySelectorLabel.innerHTML = drawOpacity;
  opacitySelector.value = drawOpacity;
  if (selectedIds.length > 0) {
    for (var o = 0; o < selectedIds.length; o++) {
      var currId = selectedIds[o].id;
      var type = selectedIds[o].geometry.type;
      if (type == "Polygon" || type == "MultiPolygon") {
        draw.setFeatureProperty(currId, "opacity", drawOpacity);
      }
    }
  }
}
opacitySelector.oninput = (e) => {
  var currOpacity = parseFloat(opacitySelector.value);
  setOpacity(currOpacity);
};
////DASHES
function dashUnfold() {
  var dashContainer = document.getElementById("dashPalette");
  for (var i = 0; i < dashes.length; i++) {
    var btn = document.createElement("BUTTON"); // Create a <button> element
    btn.className = "paletteButton";
    btn.setAttribute("data", i);
    btn.innerHTML = dashNames[i]; // Insert text
    btn.addEventListener("click", (e) => {
      var currDash = parseInt(e.currentTarget.getAttribute("data"));
      setDash(currDash);
    });

    if (i == dashDraw) {
      btn.classList.add("active");
    }
    dashContainer.appendChild(btn);
  }
}
dashUnfold();
function setDash(dash) {
  for (var i = 0; i < dashes.length; i++) {
    var elem = document.querySelector("#dashPalette").children[i];
    elem.classList.remove("active");
  }
  document.querySelector("#dashPalette").children[dash].classList.add("active");
  dashDraw = dash;
  if (selectedIds.length > 0) {
    for (var o = 0; o < selectedIds.length; o++) {
      var currId = selectedIds[o].id;
      draw.setFeatureProperty(currId, "dash", dashes[dashDraw]);
    }
  }
}
function findDashIndex(dash) {
  var dashesString = [];
  dashes.forEach((dash) => {
    var stringDash = dash.toString();
    dashesString.push(stringDash);
  });
  var indexDash = dashesString.indexOf(dash.toString());
  return indexDash;
}
//ИНСТРУМЕНТЫ
var arrowButton = document.querySelector("#arrowButton");
arrowButton.onclick = (e) => {
  setArrow(e);
};
document.querySelector("#reverseButton").onclick = (e) => reverseLine(e);
document.querySelector("#offsetButton").onclick = (e) => setOffset(e);
document.querySelector("#pickButton").onclick = (e) => pickProperty(e);

//радиусы

var radiusSelector = document.querySelector("#radius");
var radiusSelectorLabel = document.querySelector("#radiusLabel");

radiusSelector.oninput = () => {
  condition.bridgeMaxRadius = Math.pow(parseFloat(radiusSelector.value), 2);
  radiusSelectorLabel.innerHTML = condition.bridgeMaxRadius;

  var selected = draw.getSelected();
  selected.features.forEach((element) => {
    if (element.geometry.type == "LineString") {
      if (element.properties.bridge == true) {
        cleanGeojsonBridge(element.id);
        draw.setFeatureProperty(
          element.id,
          "radiusBridge",
          condition.bridgeMaxRadius
        );
        createBridge(element);
      } else if (element.properties.road == true) {
        cleanGeojsonRoad(element.id);
        draw.setFeatureProperty(
          element.id,
          "radiusBridge",
          condition.bridgeMaxRadius
        );
        createRoad(element);
      } else {
        if (element.properties.radiusBridge) {
          if (element.properties.radiusBridge !== condition.bridgeMaxRadius) {
            radiusLineString(element);
          }
        } else {
          radiusLineString(element);
        }
      }
    }
  });
};

function radiusLineString(data) {
  var currId = data.id;
  data.properties.radiusBridge = condition.bridgeMaxRadius;
  var straightLine;
  originalLines.forEach((orig) => {
    if (orig.id == currId) {
      orig.properties = data.properties;
      straightLine = JSON.parse(JSON.stringify(orig));
    }
  });
  if (!straightLine) {
    originalLines.push(data);
    straightLine = data;
  }
  draw.delete(currId);
  var curvedLine = roundCorners(straightLine, condition.bridgeMaxRadius);
  curvedLine.properties = data.properties;
  curvedLine.id = currId;
  draw.add(curvedLine);

  draw.changeMode(`simple_select`, { featureIds: [currId] });
}
//МОСТЫ

var widthBridgeSelector = document.querySelector("#bridgeWidth");
var widthBridgeSelectorLabel = document.querySelector("#bridgeWidthLabel");

widthBridgeSelector.oninput = () => {
  condition.bridgeWidth = parseFloat(widthBridgeSelector.value);
  widthBridgeSelectorLabel.innerHTML = condition.bridgeWidth;
  condition.bridgeStepSize = parseFloat(widthBridgeSelector.value) / 2 + 1;
  var selected = draw.getSelected();
  selected.features.forEach((element) => {
    if (
      element.geometry.type == "LineString" &&
      element.properties.bridge == true
    ) {
      cleanGeojsonBridge(element.id);
      draw.setFeatureProperty(element.id, "widthBridge", condition.bridgeWidth);
      createBridge(element);
    } else if (
      element.geometry.type == "LineString" &&
      element.properties.road == true
    ) {
      cleanGeojsonRoad(element.id);
      draw.setFeatureProperty(element.id, "widthBridge", condition.bridgeWidth);
      createRoad(element);
    }
  });
};

var heightBridgeSelector = document.querySelector("#bridgeHeight");
var heightBridgeSelectorLabel = document.querySelector("#bridgeHeightLabel");
heightBridgeSelector.oninput = () => {
  condition.bridgeHeight = parseInt(heightBridgeSelector.value);
  heightBridgeSelectorLabel.innerHTML = condition.bridgeHeight;
  var selected = draw.getSelected();
  selected.features.forEach((element) => {
    if (
      element.geometry.type == "LineString" &&
      element.properties.bridge == true
    ) {
      if (element.properties.bridgeHeight !== condition.bridgeHeight) {
        cleanGeojsonBridge(element.id);
        draw.setFeatureProperty(
          element.id,
          "bridgeHeight",
          condition.bridgeHeight
        );
        createBridge(element);
      }
    }
  });
};

var opacityBridgeSelector = document.querySelector("#bridgeOpacity");
var opacityBridgeSelectorLabel = document.querySelector("#bridgeOpacityLabel");
opacityBridgeSelector.oninput = () => {
  condition.bridgeOpacity = parseFloat(opacityBridgeSelector.value);
  opacityBridgeSelectorLabel.innerHTML = condition.bridgeOpacity;
  map.setPaintProperty(
    "extrudedPathPoly",
    "fill-extrusion-opacity",
    condition.bridgeOpacity
  );
  map.setPaintProperty(
    "bldPoly",
    "fill-extrusion-opacity",
    condition.bridgeOpacity
  );
};
/*
var colorBridgeSelector = document.querySelector("#bridgeColor");
colorBridgeSelector.oninput = () => {
  condition.bridgeColor = colorBridgeSelector.value;
  var selected = draw.getSelected();
  selected.features.forEach((element) => {
    if (
      element.geometry.type == "LineString" &&
      element.properties.bridge == true
    ) {
      if (element.properties.colorBridge !== condition.bridgeColor) {
        cleanGeojsonBridge(element.id);
        draw.setFeatureProperty(
          element.id,
          "colorBridge",
          condition.bridgeColor
        );
        createBridge(element);
      }
    }
  });
};*/

var leftBridgeButton = document.querySelector("#leftBridge");
var fullBridgeButton = document.querySelector("#fullBridge");
var rightBridgeButton = document.querySelector("#rightBridge");

leftBridgeButton.onclick = (e) => {
  bridgeSlope(e, "left");
};
fullBridgeButton.onclick = (e) => {
  bridgeSlope(e, "full");
};
rightBridgeButton.onclick = (e) => {
  bridgeSlope(e, "right");
};

function bridgeSlope(event, type) {
  leftBridgeButton.classList.remove("active");
  fullBridgeButton.classList.remove("active");
  rightBridgeButton.classList.remove("active");
  event.currentTarget.classList.add("active");
  condition.bridgeType = type;
  var selected = draw.getSelected();
  selected.features.forEach((element) => {
    if (
      element.geometry.type == "LineString" &&
      element.properties.bridge == true
    ) {
      if (element.properties.bridgeType !== condition.bridgeType) {
        cleanGeojsonBridge(element.id);
        draw.setFeatureProperty(element.id, "bridgeType", condition.bridgeType);
        createBridge(element);
      }
    }
  });
}

var makeBridgeButton = document.querySelector("#makeBridge");
makeBridgeButton.onclick = () => {
  condition.bridge = true;
  draw.changeMode(`draw_line_string`);
};

var makeRoadButton = document.querySelector("#makeRoad");
makeRoadButton.onclick = () => {
  condition.road = true;
  draw.changeMode(`draw_line_string`);
};

//////////////TITLES
var paletteTitles = document.getElementsByClassName("paletteTitle");
for (var i = 0; i < paletteTitles.length; i++) {
  paletteTitles[i].onclick = (e) => {
    togglePaletteDom(e);
  };
}

function togglePaletteDom(e) {
  var targetDOM = e.currentTarget.nextElementSibling;
  var arrowDOM = e.currentTarget.children[1];
  if (targetDOM.style.display === "none") {
    targetDOM.style.display = "flex";
    arrowDOM.className = "fas fa-angle-up";
  } else {
    targetDOM.style.display = "none";
    arrowDOM.className = "fas fa-angle-down";
  }
}

//////////
//BUILDINGS
/////////
function cleanBlds(id) {
  shadowPolyData.features.forEach((feature, index, object) => {
    if (feature.properties.id == id || feature.id == id) {
      object.splice(index, 1);
    }
  });
  bldPolyData.features.forEach((feature, index, object) => {
    if (feature.properties.id == id || feature.id == id) {
      object.splice(index, 1);
    }
  });
}

var bldHeightInput = document.querySelector("#bldHeight");
bldHeightInput.oninput = (e) => {
  var height = parseInt(e.target.value);
  var floors = (bldHeights[height] - 3) / 3;
  if (floors < 0) {
    floors = 0;
  }
  document.querySelector("#bldHeightLabel").innerHTML = floors;
  var currSelected = draw.getSelected();

  if (currSelected.features.length > 0) {
    currSelected.features.forEach((feature) => {
      if (
        feature.geometry.type == "Polygon" &&
        //feature.properties.height &&
        height > 0
      ) {
        if (feature.properties.height !== height) {
          var id = feature.properties.id;
          if (!id) {
            id = feature.id;
          }
          feature.properties.height = bldHeights[height];
          feature.properties.id = id;
          draw.setFeatureProperty(id, "height", bldHeights[height]);
          //draw.setFeatureProperty(id, "width", 0);
          cleanBlds(id);
          //
          bldPolyData.features.push(feature);
          shadowPolyData.features.push(makeShadow(feature));
          map.getSource("bldPolySource").setData(bldPolyData);
          map.getSource("shadowBldSource").setData(shadowPolyData);
        }
      } else if (
        feature.geometry.type == "Polygon" &&
        feature.properties.height &&
        height == 0
      ) {
        var id = feature.properties.id;
        if (!id) {
          id = feature.id;
        }
        draw.setFeatureProperty(id, "height", null);
        // draw.setFeatureProperty(id, "width", defWidth);
        //draw.setFeatureProperty(id, "width", null);
        cleanBlds(id);
        map.getSource("bldPolySource").setData(bldPolyData);
        map.getSource("shadowBldSource").setData(shadowPolyData);
      }
    });
  }
};

map.on("click", "bldPoly", (e) => {
  if (draw.getMode() == "simple_select") {
    let features = map.queryRenderedFeatures(e.point, {
      layers: ["bldPoly"]
    });
    var currId = features[0].properties.id;
    if (!currId) {
      currId = features[0].id;
    }
    var currSelected = draw.getSelectedIds();

    for (var i = 0; i < currSelected.length; i++) {
      if (currSelected[i] == currId) {
        return;
      }
    }

    draw.changeMode(`simple_select`, { featureIds: [currId] });
  }
});

//var fpsControl = new FPSControl();
//map.addControl(fpsControl, "top-right");
