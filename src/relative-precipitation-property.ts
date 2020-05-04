import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class ProbabilityPrecipitationProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'number',
            unit: 'percent',
            minimum: 0,
            maximum: 100,
            title,
            multipleOf: 0.1,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}
