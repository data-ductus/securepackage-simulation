import { Injectable } from '@angular/core';

@Injectable()
export class TransportService {

  stdTemp = 20;
  currTemp = 20;
  pressure = 1;
  humidity = 20;

  /*maxTemp;
  maxTempViolation = false;
  minTemp;
  minTempViolation = false;

  accelerometer;
  accelerometerViolation = false;

  minHumidity;
  minHumidityViolation = false;
  maxHumidity;
  maxHumidityViolation = false;

  minPressure;
  minPressureViolation = false;
  maxPressure;
  maxPressureViolation = false;

  gpsInclusion;*/

  constructor() { }

  temperatureSimulation = function (i) {
    this.currTemp = this.currTemp + Math.random() - 0.5;
    return {'temp': this.currTemp, 'time': i};
  };

  accelerationSimulation = function (i) {
    let acc = 0;
    if (Math.floor(Math.random() * 15) === 0) {
      acc = Math.random() * 10 - 5;
    } else {
      acc = Math.random() * 0.01 - 0.005;
    }
    return {'acc': acc, 'time': i};
  };

  pressureSimulation = function (i) {
    if (Math.floor(Math.random() * 20) === 0) {
      this.pressure = Math.random() * 100000;
    } else {
      this.pressure = Math.random() * 5;
    }
    return {'press': this.pressure, 'time': i};
  };

  humiditySimulation = function (i) {
    if (Math.floor(Math.random() * 20) === 0) {
      this.humidity = Math.random() * 100;
    } else {
      this.humidity += Math.random() - 0.5;
      if (this.humidity < 0) {
        this.humidity = 0;
      }
    }
    return {'humidity': this.humidity, 'time': i};
  }
}
