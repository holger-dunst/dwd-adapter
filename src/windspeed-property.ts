import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class WindSpeedProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'number',
            unit: 'm/s',
            title,
            multipleOf: 0.1,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
