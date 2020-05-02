import { Adapter } from 'gateway-addon';
import { DWDService, WeatherConfig } from './dwd';
import { DwdWeatherDevice } from './dwd-weather-device';
import i18n from 'i18n';

export class DWDWeatherAdapter extends Adapter {
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
            mosmixStation,
        } = manifest.moziot.config;

        const config: WeatherConfig = {
            name: 'unknown',
            repeat: 0,
            mosmixStation,
            lookAheadHours: 0,
            additionalFields: 'Neff,PPPP,FX1'
        }

        const dwdDevice = new DwdWeatherDevice(this, config);
        this.handleDeviceAdded(dwdDevice);

        const dwdService = new DWDService(config);
        dwdService.start(15 * 60, data => {
            try {
                dwdDevice.update(data);
            } catch (error) {
                console.error(error)
            }
        });
    }

}
