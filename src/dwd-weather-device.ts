import { Device } from 'gateway-addon';
import { TemperatureProperty } from './temperature-property';
import { WeatherConfig, WeatherData } from './dwd';
import { HumidityProperty } from './humidity-property';
import { CloudCoverProperty } from './cloudcover-property';
import { PressureProperty } from './pressure-property';
import { WindSpeedProperty } from './windspeed-property';
import { WindDirectionProperty } from './winddirection-property';
import { TotalPrecipitationProperty } from './total-precipitation-property';
import { ProbabilityPrecipitationProperty } from './relative-precipitation-property';

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

    // @ts-ignore
    constructor(adapter: any, private weatherConfig: WeatherConfig) {
        super(adapter, `dwdweather-${weatherConfig.mosmixStation}-${weatherConfig.lookAheadHours}`);
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
        this.temperature2mAboveSurfaceProperty = new TemperatureProperty(this, 'temperature2mAboveSurface', 'Temperatur');
        this.humidityProperty = new HumidityProperty(this, 'humidity', 'Luftfeuchtigkeit');
        this.effectiveCloudCoverProperty = new CloudCoverProperty(this, 'effectiveCloudCover', 'Wolkendecke');
        this.surfacePressureReducedProperty = new PressureProperty(this, 'surfacePressureReduced', 'Luftdruck');
        this.windSpeedProperty = new WindSpeedProperty(this, 'windSpeed', 'Windgeschwindigkeit');
        this.windDirectionProperty = new WindDirectionProperty(this, 'windDrection', 'Windrichtung');
        this.probabilityPrecipitationProperty = new ProbabilityPrecipitationProperty(this, 'probabilityPrecipitation', 'P Niederschläge (letzte Stunde)');
        this.totalPrecipitationNext24HoursProperty = new TotalPrecipitationProperty(this, 'totalPrecipitationNext24Hours', 'Niederschlagsmenge n. 24h');
    }

    update(data: WeatherData | null) {
        console.log(data);
        this.temperature2mAboveSurfaceProperty.setCachedValueAndNotify(data?.tempc || 0);
        this.humidityProperty.setCachedValueAndNotify(data?.humidity || 0);
        this.effectiveCloudCoverProperty.setCachedValueAndNotify(data?.effectiveCloudCover_perc || 0);
        this.surfacePressureReducedProperty.setCachedValueAndNotify(data?.surfacePressureReduced_Pa ? data?.surfacePressureReduced_Pa / 100 : 0);
        this.windSpeedProperty.setCachedValueAndNotify(data?.windspeed || 0);
        this.windDirectionProperty.setCachedValueAndNotify(data?.winddirection || 0);
        this.probabilityPrecipitationProperty.setCachedValueAndNotify(data?.precipitation_perc || 0);
        this.totalPrecipitationNext24HoursProperty.setCachedValueAndNotify(data?.precipitationNext24h || 0);
    }
}
