import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class WindDirectionProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'number',
            unit: '°',
            minimum: 0,
            maximum: 360,
            title,
            multipleOf: 0.1,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
