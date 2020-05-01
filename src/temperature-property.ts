import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class TemperatureProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            '@type': 'TemperatureProperty',
            type: 'number',
            unit: 'degree celsius',
            multipleOf: 0.01,
            title,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
