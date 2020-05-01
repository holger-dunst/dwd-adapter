import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class PressureProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'number',
            unit: 'hPa',
            multipleOf: 0.01,
            title,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
