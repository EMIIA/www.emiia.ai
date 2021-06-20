var TrimbleWorldLoader = {
  load: (onLoaded) => {
    System.config({
      paths: {
        "npm:": "https://unpkg.com/",
      },
      map: {
        "react": "npm:react@16.13.1/umd/react.production.min.js",
        "react-dom": "npm:react-dom@16.13.1/umd/react-dom.production.min.js",
        "prop-types": "npm:prop-types@15.6.2/prop-types.min.js",
      },
    });

    Promise.all([
      System.import("https://3d.connect.trimble.com/components/webgl-viewer/dist/amd/index.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer/dist/amd/ContextMenu.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer-plugin-trimbim/dist/amd/index.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer-plugin-trimbim/dist/amd/ConnectIdentifier.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer-plugin-trimbim/dist/amd/HierarchySelection.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer-plugin-compass/dist/amd/index.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer-plugin-icons/dist/amd/index.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer-plugin-markup/dist/amd/index.js"),
      System.import("https://3d.connect.trimble.com/components/webgl-viewer-plugin-potree/dist/amd/index.js"),
      System.import("https://3d.connect.trimble.com/components/react-hotkeys/umd/react-hotkeys.min.js"),
    ]).then((modules) => {
      webglViewer = modules[0];
      ContextMenu = modules[1];
      webglViewerPluginTrimbim = modules[2];
      ConnectIdentifier = modules[3];
      HierarchySelection = modules[4];
      webglViewerPluginCompass = modules[5];
      webglViewerPluginIcons = modules[6];
      webglViewerPluginMarkup = modules[7];
      webglViewerPluginPotree = modules[8];
      ReactHotkeys = modules[9];

      System.import("trimbleworld.js").then(onLoaded);
    });
  }
};
