import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class WindDirectionProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'integer',
            unit: '°',
            minimum: 0,
            maximum: 360,
            title,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
