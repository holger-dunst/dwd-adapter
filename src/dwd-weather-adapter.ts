import { Adapter, Device } from 'gateway-addon';
import { WeatherConfig } from './dwd';
import { DwdWeatherDevice } from './dwd-weather-device';
import i18n from 'i18n';

export class DWDWeatherAdapter extends Adapter {
    private knownStations: Set<string> = new Set();

    private readonly stations: any;

    constructor(addonManager: any, manifest: any) {
        super(addonManager, DWDWeatherAdapter.name, manifest.name);
        addonManager.addAdapter(this);

        const language = this.preferences.language;

        i18n.configure({
            defaultLocale: 'en',
            locales: ['en', 'de'],
            directory: __dirname + '/locales'
        });
        i18n.setLocale(language);

        // : 'H522', 0
        const {
            stations
        } = manifest.moziot.config;

        this.stations = stations;

        this.startPairing();
    }

    startPairing() {
        for (const station of this.stations) {
            if (!this.knownStations.has(station.mosmixStation)) {
                this.knownStations.add(station.mosmixStation);
                const config: WeatherConfig = {
                    name: station.mosmixStation,
                    repeat: 0,
                    mosmixStation: station.mosmixStation,
                    lookAheadHours: 0,
                    additionalFields: 'Neff,PPPP,FX1'
                }
                const dwdDevice = new DwdWeatherDevice(this, config);
                this.handleDeviceAdded(dwdDevice);
            }
        }
    }

    removeThing(device: Device) {
        if (this.devices.hasOwnProperty(device.id)) {
            const dwdDevice = device as DwdWeatherDevice;
            this.knownStations.delete(dwdDevice.weatherConfig.mosmixStation)
            dwdDevice.stop();
            this.handleDeviceRemoved(device);
        }
    }
}
