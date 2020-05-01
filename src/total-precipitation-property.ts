import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class TotalPrecipitationProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'number',
            unit: 'kg/m2',
            multipleOf: 0.01,
            title,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
