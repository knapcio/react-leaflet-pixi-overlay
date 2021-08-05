# react-leaflet-pixi-overlay

A react wrapper for the awesome Pixi Overlay: https://github.com/manubb/Leaflet.PixiOverlay

## Installing

```
yarn add react-leaflet-pixi-overlay
```

## Example

```js
import PixiOverlay from 'react-leaflet-pixi-overlay';
import { Map } from 'react-leaflet';
import { renderToString } from 'react-dom/server';

const App = () => {

    const markers = [{
            id: 'randomStringOrNumber',
            iconColor: 'red',
            position: [-37.814, 144.96332],
            popup: renderToString(
              <div>All good!</div>
            ),
            onClick: () => alert('marker clicked'),
            tooltip: 'Hey!',
        },
        {
            id: '2',
            iconColor: 'blue',
            position: [-37.814, 144.96332],
            popup: 'Quack!',
            popupOpen: true, // if popup has to be open by default
            onClick: () => alert('marker clicked'),
            tooltip: 'Nice!',
        }
    ];

    return {
        <Map
            preferCanvas={true}
            maxZoom={20}
            minZoom={3}
            center={[-37.814, 144.96332]}
            // Other map props...
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <PixiOverlay markers={markers} />
        </Map>
    };
}
```

## Marker object props

| Prop               | Required |                                                            Comment |
| ------------------ | :------: | -----------------------------------------------------------------: |
| id                 |   yes    |                                    String or Int; Unique marker ID |
| position           |   yes    |                                                              Array |
| iconColor          |  yes/no  |   String (any valid html color); Required if not using customIcon. |
| popup              |    no    |                                    String or HTML parsed to String |
| popupOpen          |    no    | Boolean. Determines if popup is open by default. Only 1 at a time. |
| onClick            |    no    |                                                           Function |
| tooltip            |    no    |                                                             String |
| customIcon         |    no    |                                                             String |
| iconId             |  yes/no  |                          String; Required only if using customIcon |
| markerSpriteAnchor |    no    |          number[] useful for marker icon calibration `ex: [0.5,1]` |

## Result

![Map](https://i.imgur.com/i9Ds1kr.jpg)

## Custom Icon

```js
const markers = [
  {
    id: "someIDUniqueToMarker",
    iconId: "someIDUniqueToIcon", // used for cache
    customIcon:
      '<svg style="-webkit-filter: drop-shadow( 1px 1px 1px rgba(0, 0, 0, .4));filter: drop-shadow( 1px 1px 1px rgba(0, 0, 0, .4));" xmlns="http://www.w3.org/2000/svg" fill="red" width="36" height="36" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 6.243 6.377 6.903 8 16.398 1.623-9.495 8-10.155 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.342-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>',
  },
];
```

## Contribution guidelines

To contribute to project codebase, fork the repo and create Pull
Requests pointing to master branch.

### Local setup

The best way to run and develop the package is to import the local clone to
local react project. It can be done with help of yarn link functionality. All
peer dependencies must be linked. Here is how to do it:

```
cd YOUR_CLONNED_REACT_LEAFLET_PIXI_OVERLAY_FORK
yarn link
yarn install
cd node_modules/react
yarn link
cd ../react-dom
yarn link
cd ../leaflet
yarn link
cd ../react-leaflet
yarn link

cd YOUR_REACT_PROJECT
yarn link react-leaflet-pixi-overlay
yarn link react
yarn link react-dom
```

To compile any changes introduced to code, run `yarn build`.

## License

This project is licensed under the MIT License.
