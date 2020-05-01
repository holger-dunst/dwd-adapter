import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class WindSpeedProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'integer',
            unit: 'm/s',
            title,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
