import { useEffect, useState } from 'react';
//leaflet
import L from 'leaflet';

//pixi-overlay
import * as PIXI from 'pixi.js';
import 'leaflet-pixi-overlay';

import { useLeafletMap } from 'use-leaflet';

PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false;
PIXI.utils.skipHello();
const PIXILoader = PIXI.Loader.shared;

const PixiOverlay = ({
	markers,
}) => {
	const [openedPopupData, setOpenedPopupData] = useState(null);
	const [openedTooltipData, setOpenedTooltipData] = useState(null);

	const [openedPopup, setOpenedPopup] = useState(null);
	const [openedTooltip, setOpenedTooltip] = useState(null);

	const [pixiOverlay, setPixiOverlay] = useState(null);
	const [loaded, setLoaded] = useState(false);
	const map = useLeafletMap();

	// load sprites
	useEffect(() => {
		// cancel loading if already loading as it may cause: Error: Cannot add resources while the loader is running.
		if (PIXILoader.loading) {
			PIXILoader.reset();
		}

		let loadingAny = false;
		for(let marker of markers) {
			const resolvedMarkerId = marker.iconId || marker.iconColor;

			// skip if no ID or already cached
			if((!marker.iconColor && !marker.iconId) || PIXILoader.resources[`marker_${resolvedMarkerId}`]) {
				continue;
			}
			loadingAny = true;

			PIXILoader.add(`marker_${resolvedMarkerId}`,
				marker.customIcon ? getEncodedIcon(marker.customIcon) : getDefaultIcon(marker.iconColor));
		}
		if(loaded && loadingAny) {
			setLoaded(false);
		}

		if(loadingAny) {
			PIXILoader.load(() => setLoaded(true));
		}
		else {
			setLoaded(true);
		}
	}, [markers]);

	// load pixi when map changes
	useEffect(() => {
		let pixiContainer = new PIXI.Container();
		let overlay = L.pixiOverlay(utils => {
			// redraw markers
			const scale = utils.getScale();
			utils.getContainer().children.forEach(child => child.scale.set(1 / scale));

			utils.getRenderer().render(utils.getContainer());
		}, pixiContainer);
		overlay.addTo(map);
		setPixiOverlay(overlay);

		setOpenedPopupData(null);
		setOpenedTooltipData(null);

		return () => pixiContainer.removeChildren();
	}, [map]);

	// draw markers first time in new container
	useEffect(() => {
		if (pixiOverlay && markers && loaded) {
			const utils = pixiOverlay.utils;
			let container = utils.getContainer();
			let renderer = utils.getRenderer();
			let project = utils.latLngToLayerPoint;
			let scale = utils.getScale();

			markers.forEach(marker => {
				const { id, iconColor, iconId, onClick, position, popup, tooltip, popupOpen, markerSpriteAnchor } = marker;

				const resolvedIconId = iconId || iconColor;

				if(!PIXILoader.resources[`marker_${resolvedIconId}`] || !PIXILoader.resources[`marker_${resolvedIconId}`].texture) {
					return;
				}

				const markerTexture = PIXILoader.resources[`marker_${resolvedIconId}`].texture;
				//const markerTexture = new PIXI.Texture.fromImage(url);

				markerTexture.anchor = { x: 0.5, y: 1 };

				const markerSprite = PIXI.Sprite.from(markerTexture);
        if (markerSpriteAnchor) {
          markerSprite.anchor.set(markerSpriteAnchor[0], markerSpriteAnchor[1]);
        } else {
          markerSprite.anchor.set(0.5, 1);
        }

				const markerCoords = project(position);
				markerSprite.x = markerCoords.x;
				markerSprite.y = markerCoords.y;

				markerSprite.scale.set(1 / scale);

				if (popupOpen) {
					setOpenedPopupData({
						id,
						offset: [0, -35],
						position,
						content: popup,
						onClick,
					});
				}

				if (popup || onClick || tooltip) {
					markerSprite.interactive = true;
				}

				if (popup || onClick) {
					// Prevent launchung the onClick event when drag and drop.
          let applyOnClick = true
          markerSprite.on('mousedown', () => {
            markerSprite.on('mousemove', () => {
              applyOnClick = false
            })
            markerSprite.on('mouseup', () => {
              if (applyOnClick && onClick) {
                onClick(id)
              }
            })
          })
					// Prevent the same thing for touch devices.
          markerSprite.on('touchstart', () => {
            markerSprite.on('touchmove', () => {
              applyOnClick = false
            })
            markerSprite.on('touchend', () => {
              if (applyOnClick && onClick) {
                onClick(id)
              }
            })
					});

					markerSprite.defaultCursor = 'pointer';
					markerSprite.buttonMode = true;
				}

				if (tooltip) {
					markerSprite.on('mouseover', () => {
						setOpenedTooltipData({
							id,
							offset: [0, -35],
							position,
							content: tooltip,
						});
					});

					markerSprite.on('mouseout', () => {
						setOpenedTooltipData(null);
					});
				}

				container.addChild(markerSprite);
			});

			renderer.render(container);
		}

		return () => pixiOverlay && pixiOverlay.utils.getContainer().removeChildren();

	}, [pixiOverlay, markers, loaded]);

	// handle tooltip
	useEffect(() => {
		if (openedTooltip) {
			map.closePopup(openedTooltip);
		}

		if (openedTooltipData && (!openedPopup || !openedPopupData || openedPopupData.id !== openedTooltipData.id)) {
			setOpenedTooltip(openPopup(map, openedTooltipData));
		}

	// we don't want to reload when openedTooltip changes as we'd get a loop
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [openedTooltipData, openedPopupData, map]);

	// handle popup
	useEffect(() => {
		// close only if different popup
		if (openedPopup) {
			map.closePopup(openedPopup);
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

function openPopup (map, data, extraOptions = {}, isPopup) {
	const popup = L.popup(Object.assign({ offset: data.offset }, extraOptions))
		.setLatLng(data.position)
		.setContent(data.content)
		.openOn(map);

	// TODO don't call onClick if opened a new one
	if (isPopup && data.onClick) {
		popup.on('remove', () => {
			data.onClick(null);
		});
	}

	return popup;
}

function getDefaultIcon (color) {
	const svgIcon = `<svg style="-webkit-filter: drop-shadow( 1px 1px 1px rgba(0, 0, 0, .4));filter: drop-shadow( 1px 1px 1px rgba(0, 0, 0, .4));" xmlns="http://www.w3.org/2000/svg" fill="${color}" width="36" height="36" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 6.243 6.377 6.903 8 16.398 1.623-9.495 8-10.155 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.342-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>`;
	return getEncodedIcon(svgIcon);
}

function getEncodedIcon(svg) {
	const decoded = unescape(encodeURIComponent(svg));
	const base64 = btoa(decoded);
	return `data:image/svg+xml;base64,${base64}`;
}

export default PixiOverlay;
