import { Adapter } from 'gateway-addon';
import { DWDService, WeatherConfig } from './dwd';
import { DwdWeatherDevice } from './dwd-weather-device';

export class DWDWeatherAdapter extends Adapter {
    constructor(addonManager: any, manifest: any) {
        super(addonManager, DWDWeatherAdapter.name, manifest.name);
        addonManager.addAdapter(this);

        // : 'H522', 0
        const {
            mosmixStation,
            lookAheadHours,
        } = manifest.moziot.config;

        const config: WeatherConfig = {
            name: 'Tönisvorst',
            repeat: 0,
            mosmixStation,
            lookAheadHours,
            additionalFields: 'Neff,PPPP,FX1'
        }

        const dwdService = new DWDService(config);

        const dwdDevice = new DwdWeatherDevice(this, config);
        this.handleDeviceAdded(dwdDevice);

        dwdService.start(15 * 60, data => {
            try {
                console.log('Query dwd station data')
                dwdDevice.update(data);
            } catch (error) {
                console.error(error)
            }
        });
    }

}
