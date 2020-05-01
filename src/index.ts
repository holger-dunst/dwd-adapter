import { DWDWeatherAdapter } from './dwd-weather-adapter';

export = (addonManager: any, manifest: any) => new DWDWeatherAdapter(addonManager, manifest);