# react-leaflet-pixi-overlay

A react wrapper for the awesome Pixi Overlay: https://github.com/manubb/Leaflet.PixiOverlay

## Installing

Not added to npm yet:

```
yarn add https://github.com/knapcio/react-leaflet-pixi-overlay
```

## Example

```js
import { PixiOverlay } from 'react-leaflet-pixi-overlay';
import { Map } from 'react-leaflet';
import { renderToString } from 'react-dom/server';

const App = () => {

    const markers = [{
            id: 'randomStringOrNumber',
            iconColor: 'red', // colors: https://github.com/pointhi/leaflet-color-markers
            position: [-37.814, 144.96332],
            popup: renderToString(
              <div>All good!</div>
            ),
            onClick: () => alert('marker clicked'),
            tooltip: 'Hey!',
        },
        {
            id: '2',
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

| Prop        | Required           | Comment  |
| ------------- |:-------------:| -----:|
| id      | yes | String or Int |
| position      | yes      |   Array |
| iconColor      | no      |   String (one of the values from https://github.com/pointhi/leaflet-color-markers) |
| popup | no      |    String or HTML parsed to String |
| popupOpen | no      |    Boolean. Determines if popup is open by default. Only 1 at a time. |
| onClick | no      |    Function |
| tooltip | no      |    String |

## Result

![Map](https://i.imgur.com/i9Ds1kr.jpg)

## License

This project is licensed under the MIT License.
