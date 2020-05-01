import { Property } from 'gateway-addon';
import { DwdWeatherDevice } from './dwd-weather-device';

export class ProbabilityPrecipitationProperty extends Property {
    constructor(device: DwdWeatherDevice, name: string, title: string) {
        super(device, name, {
            type: 'integer',
            unit: 'percent',
            minimum: 0,
            maximum: 100,
            title,
            readOnly: true
        });

        device.properties.set(name, this);
    }
}