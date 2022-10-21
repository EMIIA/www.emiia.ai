<html>
  <head>
    <title>ГП-ГЗК 3.0</title>
    <meta charset="UTF-8" />
    <link rel="icon" href="data/favicon.svg" />
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
    <script src="https://api.tiles.mapbox.com/mapbox-gl-js/v2.3.0/mapbox-gl.js"></script>
    <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.0/mapbox-gl-geocoder.min.js"></script>
    <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.2.0/mapbox-gl-draw.js"></script>
    <script src="https://unpkg.com/@turf/turf@6.3.0/turf.min.js"></script>
    <script src="https://unpkg.com/deck.gl@latest/dist.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@loaders.gl/3d-tiles@3.0.11/dist/dist.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@loaders.gl/gltf@3.0.3/dist/dist.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js"></script>
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="./data/styles.css"
      type="text/css"
      crossorigin="anonymous"
    />
    <link
      href="https://api.mapbox.com/mapbox-gl-js/v2.3.0/mapbox-gl.css"
      crossorigin="anonymous"
      rel="stylesheet"
    />

    <link
      rel="stylesheet"
      href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.2.0/mapbox-gl-draw.css"
      type="text/css"
      crossorigin="anonymous"
    />

    <link
      href="https://use.fontawesome.com/releases/v5.10.2/css/all.css"
      crossorigin="anonymous"
      rel="stylesheet"
    />

    <link
      rel="stylesheet"
      href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.0/mapbox-gl-geocoder.css"
      crossorigin="anonymous"
      type="text/css"
    />
    <style>
      @font-face {
        font-family: "Moscow Sans Regular";
        src: url("./data/MoscowSansRegular.ttf") format("truetype");
      }

      @font-face {
        font-family: "Moscow Sans Bold";
        src: url("./data/MoscowSansBold.ttf") format("truetype");
      }
      body {
        margin: 0;
        padding: 0;
      }
      #map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
    <script>
      function colorManager(e) {
        var value = parseInt(e.currentTarget.value);
        var color;
        var text = "#000";
        switch (value) {
          case 1:
          case 2:
          case 3:
          case 4:
            color = "#9dd363";
            break;
          case 4:
          case 5:
          case 6:
            color = "#e3e303";
            break;
          case 7:
            color = "#e7b110";
            break;
          case 8:
            color = "#f7743a";
            break;
          case 9:
            color = "#c93939";
            text = "#fff";
            break;
          case 10:
            color = "#8d3939";
            text = "#fff";
            break;
          default:
            color = "";
        }
        e.currentTarget.style.background = color;
        e.currentTarget.style.color = text;
      }
    </script>
  </head>

  <body>
    <div id="map" oncontextmenu="return false;"></div>
    <div id="drop">
      <div id="dropBorder">
        <div id="innerDrop">
          <img id="hand" src="./data/hand.svg" />
          <h id="labelDrop">[ drop IMAGE/GEOJSON ]</h>
        </div>
      </div>
    </div>
    <div id="tab">
        <button
        class="headerButton"
        id="layersButton"
        data-title="Включить/Перенести слои"
      >
      <i class="fas fa-layer-group"></i>
    </button>
      <div class="break"></div>
      <!--
      <button
        class="headerButton"
        id="ППТ"
        data-title="Включить разрабатываемые ППТ"
        style="background-image: url(./data/icons/PPT-razr.svg);"
      ></button>
      <button
        class="headerButton"
        id="ППТold"
        data-title="Включить утвержденные ППТ"
        style="background-image: url(./data/icons/PPT-utv.svg);"
      ></button>
      <div class="break"></div>
      <button
        class="headerButton"
        id="ZU"
        data-title="Кадастр"
        style="
          filter: invert(45%);
          background-image: url(./data/icons/cadastre.svg);
        "
      ></button>
      <div class="break"></div>
      <button class="headerButton" id="🗺" data-title="Спутниковая подложка">
        <i class="fas fa-globe-europe"></i>
      </button>
      <button id="launch" data-title="3D" class="headerButton">
        <i class="fab fa-fly"></i>
      </button>
      <div class="break"></div>
    -->
      <button
        id="iso"
        data-title="5 мин. пешком"
        class="headerButton"
        style="
          filter: invert(45%);
          background-image: url(./data/icons/pesh.svg);
        "
      ></button>
      <button
        id="popup"
        data-title="Полосность"
        class="headerButton"
        style="
          filter: invert(45%);
          background-image: url(./data/icons/lanes.svg);
        "
      ></button>
      <div class="break"></div>
      <button
        id="dlDraw"
        data-title="Скачать полигоны"
        class="headerButton"
        style="
          filter: invert(45%);
          background-image: url(./data/icons/download_poly.svg);
        "
      ></button>
      <button
        id="modelLoadDOM"
        data-title="Загрузить модель"
        class="headerButton"
      >
        <i class="fas fa-city"></i>
      </button>

      <button
        id="download"
        data-title="Сохранить скриншот"
        class="headerButton"
        style="
        filter: invert(45%);
        background-image: url(./data/icons/download_image.svg);
      "
      >
       <!-- <i class="fas fa-save"></i>-->
      </button>
      <div class="break"></div>
      <button
        id="clear"
        data-title="Очистить экран"
        class="headerButton"
        style="color: #ad1a1e;"
      >
        <i class="far fa-times-circle"></i>
      </button>

      <div id="ngptDOM">
        <span id="ngptCount">1</span>
        <object
          type="image/svg+xml"
          id="busIcon"
          data="/data/bus.svg"
          width="15"
          height="15"
        ></object>
      </div>
      <div id="imageGeoref">
        <button
          class="headerButton"
          id="editImageButton"
          data-title="Редактировать изображение"
        >
          <i class="fas fa-image"></i>
        </button>
        <input
          id="imgOpacity"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value="0.85"
        />
        <button
          class="headerButton"
          id="saveImageButton"
          data-title="Сохранить изображение"
        >
        <i class="fas fa-file-download"></i>
        </button>
        <button
          class="headerButton"
          id="clearImageButton"
          data-title="Удалить изображение"
        >
          <i class="fas fa-trash"></i>
        </button>
        <div id="maskTab"></div>
      </div>
      <button id="hide"><i class="fas fa-arrow-left"></i></button>
    </div>

    <svg width="0" height="0">
      <defs>
        <clipPath id="myClip">
          <path
            d="M56,23C56,10.3,45.7,0,33,0H0c12.7,0,23,10.3,23,23v37c0,12.7-10.3,23-23,23h33c12.7,0,23-10.3,23-23V23z"
          />
        </clipPath>
      </defs>
    </svg>

    <!--<div id="toggleLayers">
      <button
        id="metroLines"
        data-title="Полосность"
        class="headerButton"
        style="
          filter: invert(45%);
          background-image: url(./data/icons/lanes.svg);
        "
      ></button>
    </div>-->

    <div id="modelDOM">
      <b style="color: white; padding: 4px;">.json файл модели здания:</b>
      <form id="urlField">
        <input
          id="linkFootprint"
          type="text"
          name="text"
          value="https://smart.mos.ru/geodata/3dtiles/bim/00033/City_2.json"
        />

        <input id="loadLinkFootprint" type="submit" value="Загрузить" />
      </form>
      <button id="closeModelDOM">×</button>
    </div>
    <div id="loadingScreen">
      <div id="dots">
        <div class="lds-grid">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      <div id="progressScreenshot">
        <div id="barScreenshot"></div>
      </div>
      <h id="placeholderLoading">[ 'Esc' для отмены ]</h>
    </div>

    <div id="layersDOM" style="display:none">
      <span id="layersTitle">Слои:</span>
      <section class="tasks">
        <ul class="tasks__list">
          <li class="tasks__item selected" data="tpu,rail-stations,metro-stations-close copy"> <image src="./data/icons/layer-icons/stations.jpg" class="layerIllustration">
            Станции метро/МЦД
          </li>
          <li
            class="tasks__item selected"
            data="road-label,road-oneway-arrows,traffic-lights,poi-label,address-label,settlement-label,rayon-label"
          ><image src="./data/icons/layer-icons/streets.jpg" class="layerIllustration">
            Подписи улиц/Объектов
          </li>
          <li class="tasks__item selected" data="places-5y0blc,places-5y0blc2"><image src="./data/icons/layer-icons/ngpt.jpg" class="layerIllustration">
            Остановки НГПТ
          </li>
          <li
            class="tasks__item selected"
            data="metroLineWhite,metroLine,metroLine-constructing,MCC-red,MCC-white"
          ><image src="./data/icons/layer-icons/lines.jpg" class="layerIllustration">
            Линии метро/МЦД
          </li>
          
          <li class="tasks__item" data="cadastre"><image src="./data/icons/layer-icons/cadastre.jpg" class="layerIllustration">Кадастр</li>
            <!--<li class="tasks__item" data="tileset"><image src="./data/icons/layer-icons/3d.jpg" class="layerIllustration">3D</li>-->
          <li class="tasks__item" data="ППТ,ППТ_line" id="PPT-container" style="padding-left:4px;justify-content: space-between"><div id="ППТ-old" class="tasks__subitem"><image src="./data/icons/layer-icons/ppt.jpg" class="layerIllustration" style="margin: 0px;margin-left: 0px;margin-right: 4px;">ППТ утв.</div><div class="break"></div><div id="ППТ-new" class="tasks__subitem" style="margin-right: -3px;"><image src="./data/icons/layer-icons/ppt-new.jpg" class="layerIllustration" style="margin: 0px;margin-left: 0px;margin-right: 4px;">ППТ разр.</div></li>
            <!--<li class="tasks__item" data="ППТ" id="ППТ-old"><image src="./data/icons/layer-icons/ppt.jpg" class="layerIllustration">ППТ утвержденные</li>
              <li class="tasks__item" data="ППТ" id="ППТ-new"><image src="./data/icons/layer-icons/ppt.jpg" class="layerIllustration">ППТ в разработке</li>-->
                <li class="tasks__item" data="sat" id="sat-container" style="padding-left:4px;justify-content: space-between"><div id="sat-mka" class="tasks__subitem"><image src="./data/icons/layer-icons/sat1.jpg" class="layerIllustration" style="margin: 0px;margin-left: 0px;margin-right: 4px;">Спутник<br>МКА</div><div class="break"></div><div id="sat-google" class="tasks__subitem" style="margin-right: -3px;"><image src="./data/icons/layer-icons/sat2.jpg" class="layerIllustration" style="margin: 0px;margin-left: 0px;margin-right: 4px;">Спутник<br>Google</div></li>
                <!--<li class="tasks__item" data="sat"><image src="./data/icons/layer-icons/sat1.jpg" class="layerIllustration">Спутник</li>-->
           <li class="tasks__item" data="yndx"><image src="./data/icons/layer-icons/yndx.jpg" class="layerIllustration">
            Яндекс карта
          </li> 
          <li class="tasks__item selected" data="moscow-boundary"><image src="./data/icons/layer-icons/mask.jpg" class="layerIllustration">
            Маска Московской области
          </li>
          <li class="tasks__item selected" data="roads-aip,roads-aip-bridge,bridges-constructing"><image src="./data/icons/layer-icons/UDS.jpg" class="layerIllustration">
            Планируемая УДС
          </li>
          <li class="tasks__item selected" data="platform,platform-main,platform copy,platform-stroke"><image src="./data/icons/layer-icons/podzem.jpg" class="layerIllustration">
            Подземные сооружения<br>и платформы
          </li>
          
          <!--<li class="tasks__item" data="overlay"><image src="./data/icons/layer-icons/stations.jpg" class="layerIllustration">Изображение</li>-->
        </ul>
      </section>
    </div>
    <script src="data/index2.js"></script>
  </body>
</html>
