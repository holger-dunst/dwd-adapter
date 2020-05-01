import request from 'request';
import { createStream, QualifiedAttribute, QualifiedTag, Tag } from 'sax';
import unzipper from 'unzipper';

export interface WeatherData {
    precipitation_perc: number;
    precipitationNext24h: number;
    forecast_dt: number;
    station: string;
    humidity: number;
    windspeed: number;
    tempc: number;
    winddirection: number;
    effectiveCloudCover_perc: number,
    surfacePressureReduced_Pa: number,
    maxWindGustWithinTheLastHour_ms: number
}

export interface WeatherConfig {
    name: string;
    lookAheadHours: number;
    additionalFields: string;
    repeat: number;
    mosmixStation: string;
}

export class DWDService {
    private static MOSMIX_URL = 'https://opendata.dwd.de/weather/local_forecasts/mos/MOSMIX_L/single_stations/{$station}/kml/MOSMIX_L_LATEST_{$station}.kmz';
    private static MOSMIX_MAXAGE = 3600 * 1000;
    private static mosmixElementsBase = ['TTT', 'Td', 'FF', 'DD', 'wwP', 'RR1c'];
    private weatherForecast: any = {}; // main data structure to hold weather forecast. See initWeatherForecast()
    private nextWeatherUpdate: any = {}; // Hash: mosmixStation: next update due in unix timestamp ms
    private mosmixElements: any = {};  // Hash: mosmixStation: Array with MOSMIX elements to process;

    private readonly mosmixStation: string;

    private readonly lookAhead: number;
    private additionalFields: string[];

    constructor(private config: WeatherConfig) {
        this.initWeatherForecast(this.config.mosmixStation);

        this.mosmixStation = config.mosmixStation;
        this.lookAhead = Number(config.lookAheadHours) * 3600000;
        this.additionalFields = config.additionalFields.split(',').map(v => v.trim()).filter(v => (v != ''));

        if (!this.mosmixElements[this.mosmixStation]) {
            this.mosmixElements[this.mosmixStation] = DWDService.mosmixElementsBase;
        }
        this.additionalFields.forEach(additionalFieldElement => {
            if (!this.mosmixElements[this.mosmixStation].some((element: string) => element === additionalFieldElement)) {
                this.mosmixElements[this.mosmixStation].push(additionalFieldElement);
            }

        });
    }

    private static getTempCelsius(tempK: number) {
        return tempK - 273.15;
    }

    private static getSDD(tempC: number): number {
        // returns Sättigungsdampfdruck in hPa given a temperature in Celsius
        if (tempC >= 0) {
            return 6.1078 * Math.pow(10, (7.5 * tempC) / (237.3 + tempC));
        } else {
            return 6.1078 * Math.pow(10, (7.6 * tempC) / (240.7 + tempC));
        }
    }

    public updateWeatherForecast(): Promise<any> {
        this.nextWeatherUpdate[this.mosmixStation] = (new Date).getTime() + 600 * 1000; // retry in 10 minutes in case of a failure

        let isInitialized = false;
        let xmlTagStack: (Tag | QualifiedTag)[] = [];

        const strict: boolean = true; // change to false for HTML parsing
        const options = {
            'trim': true
        }; // refer to "Arguments" section
        const saxStream = createStream(strict, options);

        saxStream.on('opentag', tag => {
            if (!isInitialized) {
                // seems we are getting data => initialize data structures
                this.initWeatherForecast(this.mosmixStation);
                this.nextWeatherUpdate[this.mosmixStation] = (new Date).getTime() + DWDService.MOSMIX_MAXAGE;
                isInitialized = true;
            }
            if (!tag.isSelfClosing) {
                xmlTagStack.push(tag);
            }
        })

        saxStream.on('closetag', () => {
            xmlTagStack.pop();
        });

        saxStream.on('text', (text) => {
            if (xmlTagStack.length) {
                const currentTag = xmlTagStack[xmlTagStack.length - 1];
                if (currentTag.name == 'kml:description') {
                    this.weatherForecast[this.mosmixStation]['description'] = text;
                }
                if (currentTag.name == 'dwd:TimeStep') {
                    this.weatherForecast[this.mosmixStation]['times'].push(new Date(text));
                }
                if (xmlTagStack.length >= 2 && currentTag.name == 'dwd:value') {
                    const enclosingTag = xmlTagStack[xmlTagStack.length - 2];
                    const attribute: string | QualifiedAttribute | undefined = enclosingTag.attributes['dwd:elementName'];
                    if (attribute) {
                        const isLookUp = this.mosmixElements[this.mosmixStation].some((mosixElement: string) => mosixElement === attribute);
                        if (enclosingTag.name == 'dwd:Forecast' && isLookUp) {
                            this.weatherForecast[this.mosmixStation][attribute.toString()] = text.split(/\s+/).map(v => Number.parseFloat(v));
                        }
                    }
                }
            }
        });

        return new Promise((resolve, reject) => {
            //console.log(MOSMIX_URL.replace(/\{\$station\}/g, node.mosmixStation));
            request.get(DWDService.MOSMIX_URL.replace(/{\$station}/g, this.mosmixStation))
              .on('error', reject)
              .on('response', (response) => {
                  if (response.statusCode === 404) {
                      reject('dwdweather.warn.noDataForStation');
                  } else if (response.statusCode !== 200) {
                      reject(response.statusCode + ' ' + response.statusMessage);
                  }
              })
              .pipe(unzipper.ParseOne(/\.kml/i))
              .on('error', reject)
              .pipe(saxStream)
              .on('error', reject)
              .on('end', () => {
                  resolve(this.weatherForecast);
              });
            // end stream
        });
    }

    public async query(): Promise<WeatherData | null> {
        await this.updateWeatherForecastIfOutdated();
        try {
            if (this.weatherForecast[this.mosmixStation]) {
                const forecastDate = new Date();
                if (this.config.lookAheadHours) {
                    const lookAheadHours = Number(this.config.lookAheadHours) || 0;
                    forecastDate.setTime(forecastDate.getTime() + lookAheadHours * 3600000);
                } else {
                    forecastDate.setTime(forecastDate.getTime() + this.lookAhead);
                }
                return {
                    station: this.weatherForecast[this.mosmixStation].description,
                    tempc: this.getForecastedTemperature(this.mosmixStation, forecastDate),
                    humidity: this.getForecastedHumidity(this.mosmixStation, forecastDate),
                    windspeed: Math.round(this.getInterpolatedValue(this.mosmixStation, 'FF', forecastDate) * 10) / 10,
                    winddirection: Math.round(this.getInterpolatedValue(this.mosmixStation, 'DD', forecastDate) * 10) / 10,
                    precipitation_perc: Math.round(this.getInterpolatedValue(this.mosmixStation, 'wwP', forecastDate) * 10) / 10,
                    precipitationNext24h: Math.round(this.sumFutureValue(this.mosmixStation, 'RR1c', 24, forecastDate) * 10) / 10,
                    effectiveCloudCover_perc: Math.round(this.getInterpolatedValue(this.mosmixStation, 'Neff', forecastDate) * 100) / 100,
                    surfacePressureReduced_Pa: Math.round(this.getInterpolatedValue(this.mosmixStation, 'PPPP', forecastDate) * 100) / 100,
                    maxWindGustWithinTheLastHour_ms: Math.round(this.getInterpolatedValue(this.mosmixStation, 'FX1', forecastDate) * 100) / 100,
                    //precipitationLast1h: Math.round(this.sumFutureValue(this.mosmixStation, 'RR1c', 24, forecastDate) * 10) / 10,
                    forecast_dt: forecastDate.getTime()
                };
            }
        } finally {
            this.nextWeatherUpdate[this.mosmixStation] = 0;
            delete this.weatherForecast[this.mosmixStation];
            this.initWeatherForecast(this.mosmixStation);
        }
        return null;
    }

    public updateWeatherForecastIfOutdated(): Promise<any> {
        if (!this.nextWeatherUpdate[this.mosmixStation] || (new Date).getTime() > this.nextWeatherUpdate[this.mosmixStation]) {
            return this.updateWeatherForecast();
        } else {
            return Promise.resolve();
        }
    }

    public start(repeat: number, callback: (data: (WeatherData | null)) => void) {
        const self = this

        function getAndUpdateData() {
            return async function () {
                const v1 = await self.query();
                callback(v1);
            };
        }

        getAndUpdateData()();
        return setInterval(getAndUpdateData(), repeat * 1000);
    }

    cancel(intervallId: NodeJS.Timeout) {
        clearInterval(intervallId);
    }

    private getForecastedTemperature(mosmixStation: string, forecastDate: Date) {
        return Math.round(DWDService.getTempCelsius(this.getInterpolatedValue(mosmixStation, 'TTT', forecastDate)) * 10) / 10;
    }

    private getForecastedHumidity(mosmixStation: string, forecastDate: Date): number {
        // calculate relative humidity from Taupunkt and temp in Celsius
        return Math.round(1000 * DWDService.getSDD(DWDService.getTempCelsius(this.getInterpolatedValue(mosmixStation, 'Td', forecastDate))) /
          DWDService.getSDD(DWDService.getTempCelsius(this.getInterpolatedValue(mosmixStation, 'TTT', forecastDate)))) / 10;
    }

    private getInterpolatedValue(mosmixStation: string, attribute: string, forecastDate: Date): any {
        if (forecastDate === null) {
            forecastDate = new Date();
        }
        if (!this.weatherForecast[mosmixStation]) {
            throw new Error('dwdweather.warn.noDataForStation');
        }
        const idx = this.weatherForecast[mosmixStation]['times'].findIndex((myDate: Date) => {
            return (myDate > forecastDate);
        });
        if (!this.weatherForecast[mosmixStation][attribute]) {
            // attribute has not been parsed
            // TODO throw new Error('dwdweather.warn.noattribute', {attribute});
            throw new Error('dwdweather.warn.noattribute');
        }

        if (idx === -1) {
            // no predictions for any future dates found - likely the file is too old
            throw new Error('dwdweather.warn.nopredictions');
        } else if (idx === 0) {
            // all predictions in file are for the future => return first one
            return this.weatherForecast[mosmixStation][attribute][0];
        } else if (Number.isNaN(this.weatherForecast[mosmixStation][attribute][idx - 1])) {
            // non-continuous field, so no interpolation possible
            return this.weatherForecast[mosmixStation][attribute][idx];
        } else {
            // linear interpolation of current temperature
            const weatherForecastElement = this.weatherForecast[mosmixStation];
            const share = (forecastDate.getTime() - weatherForecastElement.times[idx - 1].getTime()) / (weatherForecastElement.times[idx].getTime() - weatherForecastElement.times[idx - 1].getTime());
            return weatherForecastElement[attribute][idx - 1] + share * (weatherForecastElement[attribute][idx] - weatherForecastElement[attribute][idx - 1]);
        }
    }

    private sumFutureValue(mosmixStation: string, attribute: string, hours: any, forecastDate: Date) {
        if (forecastDate === null) {
            forecastDate = new Date();
        }
        if (!this.weatherForecast[mosmixStation]) {
            throw new Error('dwdweather.warn.noDataForStation');
        }
        const idx = this.weatherForecast[mosmixStation]['times'].findIndex((myDate: Date) => {
            return (myDate > forecastDate);
        });
        if (!this.weatherForecast[mosmixStation][attribute]) {
            // attribute has not been parsed
            // TODO: throw new Error(RED._('dwdweather.warn.noattribute', {attribute}));
            throw new Error('dwdweather.warn.noattribute');
        }

        if (idx === -1) {
            // no predictions for any future dates found - likely the file is too old
            throw new Error('dwdweather.warn.nopredictions');
        } else {
            let sum = 0;
            // sum x future values (x = hours), but not more than length of array
            for (let i = idx; i < this.weatherForecast[mosmixStation][attribute].length && i < hours + idx; i++) {
                if (!isNaN(this.weatherForecast[mosmixStation][attribute][i])) {
                    sum = sum + this.weatherForecast[mosmixStation][attribute][i];
                }
            }
            return sum;
        }
    }

    private initWeatherForecast(mosmixStation: string | number) {
        this.weatherForecast[mosmixStation] = {
            'description': '',
            'times': []
            // followed by additional fields like 'TTT': Array of forecast values
        };
    }
}
