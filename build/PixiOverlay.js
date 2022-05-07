"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();
//leaflet


//pixi-overlay


// react-leaflet


var _react = require("react");

var _leaflet = require("leaflet");

var _leaflet2 = _interopRequireDefault(_leaflet);

var _pixi = require("pixi.js");

var PIXI = _interopRequireWildcard(_pixi);

require("leaflet-pixi-overlay");

var _reactLeaflet = require("react-leaflet");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false;
PIXI.utils.skipHello();
var PIXILoader = PIXI.Loader.shared;

var PixiOverlay = function PixiOverlay(_ref) {
  var markers = _ref.markers;

  var _useState = (0, _react.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      openedPopupData = _useState2[0],
      setOpenedPopupData = _useState2[1];

  var _useState3 = (0, _react.useState)(null),
      _useState4 = _slicedToArray(_useState3, 2),
      openedTooltipData = _useState4[0],
      setOpenedTooltipData = _useState4[1];

  var _useState5 = (0, _react.useState)(null),
      _useState6 = _slicedToArray(_useState5, 2),
      openedPopup = _useState6[0],
      setOpenedPopup = _useState6[1];

  var _useState7 = (0, _react.useState)(null),
      _useState8 = _slicedToArray(_useState7, 2),
      openedTooltip = _useState8[0],
      setOpenedTooltip = _useState8[1];

  var _useState9 = (0, _react.useState)(null),
      _useState10 = _slicedToArray(_useState9, 2),
      pixiOverlay = _useState10[0],
      setPixiOverlay = _useState10[1];

  var _useState11 = (0, _react.useState)(false),
      _useState12 = _slicedToArray(_useState11, 2),
      loaded = _useState12[0],
      setLoaded = _useState12[1];

  var map = (0, _reactLeaflet.useMap)();

  if (map.getZoom() === undefined) {
    // this if statment is to avoid getContainer error
    // map must have zoom prop
    console.error("no zoom found, add zoom prop to map to avoid getContainer error");
    return null;
  }

  // load sprites
  (0, _react.useEffect)(function () {
    // cancel loading if already loading as it may cause: Error: Cannot add resources while the loader is running.
    if (PIXILoader.loading) {
      PIXILoader.reset();
    }

    var loadingAny = false;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = markers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var marker = _step.value;

        var resolvedMarkerId = marker.iconId || marker.iconColor;

        // skip if no ID or already cached
        if (!marker.iconColor && !marker.iconId || PIXILoader.resources["marker_" + resolvedMarkerId]) {
          continue;
        }
        loadingAny = true;

        PIXILoader.add("marker_" + resolvedMarkerId, marker.customIcon ? getEncodedIcon(marker.customIcon) : getDefaultIcon(marker.iconColor));
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    if (loaded && loadingAny) {
      setLoaded(false);
    }

    if (loadingAny) {
      PIXILoader.load(function () {
        return setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, [markers]);

  // load pixi when map changes
  (0, _react.useEffect)(function () {
    var pixiContainer = new PIXI.Container();
    var overlay = _leaflet2.default.pixiOverlay(function (utils) {
      // redraw markers
      var scale = utils.getScale();
      utils.getContainer().children.forEach(function (child) {
        return child.scale.set(1 / scale);
      });

      utils.getRenderer().render(utils.getContainer());
    }, pixiContainer);
    overlay.addTo(map);
    setPixiOverlay(overlay);

    setOpenedPopupData(null);
    setOpenedTooltipData(null);

    return function () {
      return pixiContainer.removeChildren();
    };
  }, [map]);

  // draw markers first time in new container
  (0, _react.useEffect)(function () {
    if (pixiOverlay && markers && loaded) {
      var utils = pixiOverlay.utils;
      var container = utils.getContainer();
      var renderer = utils.getRenderer();
      var project = utils.latLngToLayerPoint;
      var scale = utils.getScale();

      markers.forEach(function (marker) {
        var id = marker.id,
            iconColor = marker.iconColor,
            iconId = marker.iconId,
            onClick = marker.onClick,
            position = marker.position,
            popup = marker.popup,
            tooltip = marker.tooltip,
            tooltipOptions = marker.tooltipOptions,
            popupOpen = marker.popupOpen,
            markerSpriteAnchor = marker.markerSpriteAnchor;


        var resolvedIconId = iconId || iconColor;

        if (!PIXILoader.resources["marker_" + resolvedIconId] || !PIXILoader.resources["marker_" + resolvedIconId].texture) {
          return;
        }

        var markerTexture = PIXILoader.resources["marker_" + resolvedIconId].texture;
        //const markerTexture = new PIXI.Texture.fromImage(url);

        markerTexture.anchor = { x: 0.5, y: 1 };

        var markerSprite = PIXI.Sprite.from(markerTexture);
        if (markerSpriteAnchor) {
          markerSprite.anchor.set(markerSpriteAnchor[0], markerSpriteAnchor[1]);
        } else {
          markerSprite.anchor.set(0.5, 1);
        }

        var markerCoords = project(position);
        markerSprite.x = markerCoords.x;
        markerSprite.y = markerCoords.y;

        markerSprite.scale.set(1 / scale);

        if (popupOpen) {
          setOpenedPopupData({
            id: id,
            offset: [0, -35],
            position: position,
            content: popup,
            onClick: onClick
          });
        }

        if (popup || onClick || tooltip) {
          markerSprite.interactive = true;
        }

        if (popup || onClick) {
          // Prevent accidental launch of onClick event when dragging the map.
          // Detect very small moves as clicks.
          markerSprite.on("mousedown", function () {
            var moveCount = 0;
            markerSprite.on("mousemove", function () {
              moveCount++;
            });
            markerSprite.on("mouseup", function () {
              if (moveCount < 2 && onClick) {
                onClick(id);
              }
            });
          });
          // Prevent the same thing on touch devices.
          markerSprite.on("touchstart", function () {
            var moveCount = 0;
            markerSprite.on("touchmove", function () {
              moveCount++;
            });
            markerSprite.on("touchend", function () {
              if (moveCount < 10 && onClick) {
                onClick(id);
              }
            });
          });

          markerSprite.defaultCursor = "pointer";
          markerSprite.buttonMode = true;
        }

        if (tooltip) {
          markerSprite.on("mouseover", function () {
            setOpenedTooltipData({
              id: id,
              offset: [0, -35],
              position: position,
              content: tooltip,
              tooltipOptions: tooltipOptions || {}
            });
          });

          markerSprite.on("mouseout", function () {
            setOpenedTooltipData(null);
          });
        }

        container.addChild(markerSprite);
      });

      renderer.render(container);
    }

    return function () {
      return pixiOverlay && pixiOverlay.utils.getContainer().removeChildren();
    };
  }, [pixiOverlay, markers, loaded]);
  // handle tooltip
  (0, _react.useEffect)(function () {
    if (openedTooltip) {
      map.removeLayer(openedTooltip);
    }

    if (openedTooltipData && (!openedPopup || !openedPopupData || openedPopupData.id !== openedTooltipData.id)) {
      setOpenedTooltip(openTooltip(map, openedTooltipData));
    }

    // we don't want to reload when openedTooltip changes as we'd get a loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedTooltipData, openedPopupData, map]);

  // handle popup
  (0, _react.useEffect)(function () {
    // close only if different popup
    if (openedPopup) {
      map.removeLayer(openedPopup);
    }

    // open only if new popup
    if (openedPopupData) {
      setOpenedPopup(openPopup(map, openedPopupData, { autoClose: false }, true));
    }

    // we don't want to reload when whenedPopup changes as we'd get a loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedPopupData, map]);

  return null;
};

function openPopup(map, data) {
  var extraOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var isPopup = arguments[3];

  var popup = _leaflet2.default.popup(Object.assign({ offset: data.offset }, extraOptions)).setLatLng(data.position).setContent(data.content).addTo(map);

  // TODO don't call onClick if opened a new one
  if (isPopup && data.onClick) {
    popup.on("remove", function () {
      data.onClick(null);
    });
  }

  return popup;
}

function openTooltip(map, data) {
  var tooltip = _leaflet2.default.tooltip(Object.assign({ offset: data.offset }, data.tooltipOptions)).setLatLng(data.position).setContent(data.content).addTo(map);

  return tooltip;
}

function getDefaultIcon(color) {
  var svgIcon = "<svg style=\"-webkit-filter: drop-shadow( 1px 1px 1px rgba(0, 0, 0, .4));filter: drop-shadow( 1px 1px 1px rgba(0, 0, 0, .4));\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"" + color + "\" width=\"36\" height=\"36\" viewBox=\"0 0 24 24\"><path d=\"M12 0c-4.198 0-8 3.403-8 7.602 0 6.243 6.377 6.903 8 16.398 1.623-9.495 8-10.155 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.342-3 3-3 3 1.343 3 3-1.343 3-3 3z\"/></svg>";
  return getEncodedIcon(svgIcon);
}

function getEncodedIcon(svg) {
  var decoded = unescape(encodeURIComponent(svg));
  var base64 = btoa(decoded);
  return "data:image/svg+xml;base64," + base64;
}

exports.default = PixiOverlay;