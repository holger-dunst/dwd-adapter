import { Adapter, Device, Property } from 'gateway-addon';
import { TemperatureProperty } from './temperature-property';
import { DWDService, WeatherConfig, WeatherData } from './dwd';
import { HumidityProperty } from './humidity-property';
import { CloudCoverProperty } from './cloudcover-property';
import { PressureProperty } from './pressure-property';
import { WindSpeedProperty } from './windspeed-property';
import { WindDirectionProperty } from './winddirection-property';
import { TotalPrecipitationProperty } from './total-precipitation-property';
import { ProbabilityPrecipitationProperty } from './relative-precipitation-property';
import i18n from 'i18n';
import * as crypto from 'crypto';

const manifest = require('../manifest.json');

export class DwdWeatherDevice extends Device {
    private temperature2mAboveSurfaceProperty: TemperatureProperty;
    private humidityProperty: HumidityProperty;
    private effectiveCloudCoverProperty: CloudCoverProperty;
    private surfacePressureReducedProperty: PressureProperty;
    private windSpeedProperty: WindSpeedProperty;
    private windDirectionProperty: WindDirectionProperty;
    private probabilityPrecipitationProperty: ProbabilityPrecipitationProperty;
    private totalPrecipitationNext24HoursProperty: TotalPrecipitationProperty;
    private dwdService: DWDService;
    private polling?: NodeJS.Timeout;

    // @ts-ignore
    constructor(adapter: Adapter, readonly weatherConfig: WeatherConfig) {
        const shasum = crypto.createHash('sha1');
        shasum.update(weatherConfig.name);
        const id = `dwdweather-${shasum.digest('hex')}`;

        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['TemperatureSensor', 'MultiLevelSensor'];
        this.name = weatherConfig.name;
        this.description = manifest.description;

        // Neff - % (0..100) Effective cloud cover - Effektive Wolkendecke *
        // PPPP - Pa Surface pressure reduced *
        // FF m/s Wind speed *
        // DD 0 bis 360 Grad Wind direction *
        // wwP % (0..100) Probability: Occurrence of precipitation within the last hour *
        // RR1c kg/m2 Total precipitation during the last hour
        this.temperature2mAboveSurfaceProperty = new TemperatureProperty(this, 'temperature2mAboveSurface', i18n.__('temperature2mAboveSurface'));
        this.humidityProperty = new HumidityProperty(this, 'humidity', i18n.__('humidity'));
        this.effectiveCloudCoverProperty = new CloudCoverProperty(this, 'effectiveCloudCover', i18n.__('effectiveCloudCover'));
        this.surfacePressureReducedProperty = new PressureProperty(this, 'surfacePressureReduced', i18n.__('surfacePressureReduced'));
        this.windSpeedProperty = new WindSpeedProperty(this, 'windSpeed', i18n.__('windSpeed'));
        this.windDirectionProperty = new WindDirectionProperty(this, 'windDirection', i18n.__('windDirection'));
        this.probabilityPrecipitationProperty = new ProbabilityPrecipitationProperty(this, 'probabilityPrecipitation', i18n.__('probabilityPrecipitation'));
        this.totalPrecipitationNext24HoursProperty = new TotalPrecipitationProperty(this, 'totalPrecipitationNext24Hours', i18n.__('totalPrecipitationNext24Hours'));

        this.dwdService = new DWDService(weatherConfig);
        this.startPolling();
    }

    private static updateOnChange(property: Property, newValue?: number) {
        if (newValue !== null && property.value !== newValue) {
            property.setCachedValueAndNotify(newValue);
        }
    }

    update(data: WeatherData | null) {
        if (data) {
            console.log(data);
            DwdWeatherDevice.updateOnChange(this.temperature2mAboveSurfaceProperty, data.tempc);
            DwdWeatherDevice.updateOnChange(this.humidityProperty, data.humidity);
            DwdWeatherDevice.updateOnChange(this.effectiveCloudCoverProperty, data.effectiveCloudCover_perc);
            DwdWeatherDevice.updateOnChange(this.surfacePressureReducedProperty, data.surfacePressureReduced_Pa ? data.surfacePressureReduced_Pa / 100 : undefined);
            DwdWeatherDevice.updateOnChange(this.windSpeedProperty, data.windspeed);
            DwdWeatherDevice.updateOnChange(this.windDirectionProperty, data.winddirection);
            DwdWeatherDevice.updateOnChange(this.probabilityPrecipitationProperty, data.precipitation_perc);
            DwdWeatherDevice.updateOnChange(this.totalPrecipitationNext24HoursProperty, data.precipitationNext24h);
        }
    }

    public stop() {
        if (this.polling) {
            clearInterval(this.polling);
        }
    }

    private startPolling() {
        this.polling = this.dwdService.start(15 * 60, data => {
            try {
                this.update(data);
            } catch (error) {
                console.error(error)
            }
        });
    }
}
