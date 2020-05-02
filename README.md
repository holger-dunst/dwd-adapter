# DWD weather adapter for mozilla iot

[![build](https://github.com/holger-dunst/dwd-adapter/workflows/Build/badge.svg)](https://github.com/holger-dunst/dwd-adapter/actions?query=workflow:Build)

This adapter shows weather data offered by the German Meteorological Service called Deutscher Wetterdienst.
It uses the mosmix data. [MOSMIX forecasts](https://www.dwd.de/EN/ourservices/met_application_mosmix/met_application_mosmix.html) represent statistically optimized point forecasts. 
They are available for about 5400 locations around the world and are based on statistical optimizations of the numerical weather prediction model forecasts.

To set up a device, the station code of the local weather station is required.

Check the [catalog of stations](https://www.dwd.de/DE/leistungen/met_verfahren_mosmix/mosmix_stationskatalog.html)
for the station id. It is the third column with the name 'id'. E.g. City TOENISVORST has the id 'H522'.

Currently the adapter supports German and English. Further languages desired.

Thanks to Christian Stein for his node-red implementation 'node-red-contrib-dwd-local-weather' on which this adapter is based.
