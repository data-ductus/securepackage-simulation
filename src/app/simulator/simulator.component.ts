import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AmChartsService, AmChart } from '@amcharts/amcharts3-angular';
import { TransportService} from '../services/transport.service';
import {ApiService} from '../services/api.service';
import {GlobalsService} from '../services/globals.service';
import {ActivatedRoute, Router} from '@angular/router';

/* SimulatorComponent: handles simulation of logistics process */
@Component({selector: 'app-simulator', templateUrl: './simulator.component.html', styleUrls: ['./simulator.component.css']})

export class SimulatorComponent implements OnInit {

  //Geographic transport parameters
  direction;
  waypoints;
  time_taken;

  //Sensor charts
  private tempChart: AmChart;
  private pressChart: AmChart;
  private accChart: AmChart;
  private humidityChart: AmChart;

  //Sensor inclusion
  accelerometer_sensor_id = null;
  pressure_sensor_id = null;
  temperature_sensor_id = null;
  humidity_sensor_id = null;
  gps_sensor_id = null;

  //Sets to true if logistics terms have been violated
  violated = false;

  //Sensor thresholds
  simulation_thresholds;

  //Directions
  direct;
  origin;
  destination;

  //Sensor chart data
  time = [];
  tempData = [];
  accData = [];
  pressData = [];
  humidityData = [];

  //Duration of a single step in seconds
  stepDuration = 120;

  //For map initialization
  loc = {lat: null, lng: null};


  //API access URL
  directionUrl = '';

  constructor(private router: Router, private route: ActivatedRoute, private http: HttpClient, private amCharts: AmChartsService, private transportService: TransportService, private api: ApiService, private global: GlobalsService) { }

  ngOnInit() {
    this.initSimulation();
  }

  /**
   * Initializes charts, sets data sources.
   */
  private initCharts() {
    this.tempChart = this.amCharts.makeChart( 'tempChartDiv', {
      'type': 'serial',
      'dataProvider': this.tempData,
      'categoryField': 'time',
      'graphs': [ {
        'valueField': 'temp',
        'type': 'column'
      } ]
    } );
    this.pressChart = this.amCharts.makeChart( 'pressChartDiv', {
      'type': 'serial',
      'dataProvider': this.pressData,
      'categoryField': 'time',
      'graphs': [ {
        'valueField': 'press',
        'type': 'column'
      } ]
    } );
    this.accChart = this.amCharts.makeChart( 'accChartDiv', {
      'type': 'serial',
      'dataProvider': this.accData,
      'categoryField': 'time',
      'graphs': [ {
        'valueField': 'acc',
        'type': 'column'
      } ]
    } );
    this.humidityChart = this.amCharts.makeChart( 'humidityChartDiv', {
      'type': 'serial',
      'dataProvider': this.humidityData,
      'categoryField': 'time',
      'graphs': [ {
        'valueField': 'humidity',
        'type': 'column'
      } ]
    } );
  }

  /**
   * Initializes simulation.
   *
   * @returns {Promise<void>} Promise.
   */
  initSimulation = async function() {
    if (this.global.globalvars.current_simulation == 'BLOCKCHAIN') {
      let state = 0;
      while (state != 2 && state != 5) {
        state = await this.fetchBlockchainData();
        console.log(state);
        const delay = new Promise(resolve => setTimeout(resolve, 1000));
        await delay;
      }
      if (state == 2) {
        this.origin = await this.api.getReturnAddress(this.global.globalvars.agreement_id);
        this.destination = await this.api.getDeliveryAddress(this.global.globalvars.agreement_id);
      } else if (state == 5) {
        this.destination = await this.api.getReturnAddress(this.global.globalvars.agreement_id);
        this.origin = await this.api.getDeliveryAddress(this.global.globalvars.agreement_id);
      }
      this.directionUrl = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + this.origin + '&destination=' +
        this.destination + '&key=AIzaSyCnD7Sr2wMskuqjxVGjP8EpDnd7Olf6fCg'.replace(/ /g,"+");
      this.initCharts();
      this.getGeoCodeDirection();
    }
    else if(this.global.globalvars.current_simulation == 'DATABASE') {
      //Fetch general logistics parameters
      this.api.serverRequest({id: this.global.globalvars.agreement_id}, "FETCH_AGREEMENT_INFO").then(data => {
        this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id, current_status: data.state}, "CHECK_RETURN").then(data => {
          this.direct = data;
          this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id, direction: this.direct}, "FETCH_LOGISTICS_PARAMETERS").then(response => {
            //Fetch and set sensors
            this.api.serverRequest({kolli_id: response.kolli_id}, "FETCH_SIMULATION_SENSORS").then(data => {
              for (let sensor of data) {
                if (sensor.sensor_type === 'ACC') {
                  this.accelerometer_sensor_id = sensor.sensor_id;
                } else if (sensor.sensor_type === 'PRES') {
                  this.pressure_sensor_id = sensor.sensor_id;
                } else if (sensor.sensor_type === 'TEMP') {
                  this.temperature_sensor_id = sensor.sensor_id;
                } else if (sensor.sensor_type === 'HUMID') {
                  this.humidity_sensor_id = sensor.sensor_id;
                } else if (sensor.sensor_type === 'GPS') {
                  this.gps_sensor_id = sensor.sensor_id;
                }
              }
            });
            //Fetch directions, according to the way parcel travels (return, or delivery)
            let request_payload = {agreement_id: this.global.globalvars.agreement_id, direction: this.direct, current_status: data.state};
            this.api.serverRequest(request_payload, "FETCH_LOGISTICS_BUYER").then(data => {
              this.destination = data.street_address + " " + data.city;
              this.api.serverRequest(request_payload, "FETCH_LOGISTICS_SELLER").then(data => {
                this.origin = data.street_address + " " + data.city;
                this.api.serverRequest(request_payload, "FETCH_SIMULATION_THRESHOLDS").then(data => {
                  this.simulation_thresholds = data;
                  this.directionUrl = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + this.origin + '&destination=' +
                    this.destination + '&key=AIzaSyCnD7Sr2wMskuqjxVGjP8EpDnd7Olf6fCg'.replace(/ /g,"+");
                  this.initCharts();
                  this.getGeoCodeDirection();
                });
              });
            });
          });
        });
      });
    }
  };

  /**
   * Fetches blockchain data.
   *
   * @returns {Promise<any>} Promise.
   */
  async fetchBlockchainData() {
    await this.getSensorsBlockchain();
    return this.api.getState(this.global.globalvars.agreement_id)
  }

  /**
   * Fetches blockchain sensors.
   *
   * @returns {Promise<void>} Promise.
   */
  async getSensorsBlockchain() {
    const sensors = await this.api.getSensorsBlockchain(this.global.globalvars.agreement_id);
    console.log('sensors ', sensors);
    this.pressure_sensor_id = sensors['press']['set'] ? sensors['press']['provider']: null;
    this.humidity_sensor_id = sensors['hum']['set'] ? sensors['hum']['provider']: null;
    this.accelerometer_sensor_id = sensors['acc']['set'] ? sensors['acc']['provider']: null;
    this.temperature_sensor_id = sensors['maxTemp']['set'] ? sensors['maxTemp']['provider']: null;
    this.temperature_sensor_id = sensors['minTemp']['set'] ? sensors['minTemp']['provider']: this.temperature_sensor_id;

    this.simulation_thresholds['accelerometer'] = sensors['acc']['threshold'];
    this.simulation_thresholds['pressure_high'] = sensors['press']['threshold'];
    this.simulation_thresholds['humidity_high'] = sensors['hum']['threshold'];
    this.simulation_thresholds['temperature_high'] = sensors['maxTemp']['threshold'];
    this.simulation_thresholds['temperature_low'] = sensors['minTemp']['threshold'];
  }

  /**
   * Starts a simulation by performing first step.
   */
  startSimulation = function () {
    this.step();
  };

  /**
   * Fetches directions from Google Directions API.
   */
  getGeoCodeDirection = function () {
    this.http.get(this.directionUrl)
      .subscribe(data => {
        this.direction = {
          origin: data['routes'][0]['legs'][0]['start_location'],
          destination: data['routes'][0]['legs'][0]['end_location']
        };
        this.waypoints = data['routes'][0]['legs'][0]['steps'];
      });
  };

  /**
   * Runs simulation by calling itself, until parcel arrives.
   * @returns {Promise<void>}
   */
  async step() {
    let stepNumber = 0;
    let transportTime = 0;
    let timeStep = 0;
    while (this.direction['origin']['lat'] !== this.direction['destination']['lat'] && this.direction['origin']['lng'] !== this.direction['destination']['lng']) {
      transportTime += this.waypoints[stepNumber]['duration']['value'];
      if (((timeStep + 1) * this.stepDuration) < transportTime) {
        timeStep++;
        transportTime -= this.waypoints[stepNumber]['duration']['value'];
        this.generate((timeStep + 1) * this.stepDuration);
        await this.delay(1000);
      }
      else {
        this.direction['origin'] = this.waypoints[stepNumber]['end_location'];
        stepNumber++;
      }
    }
    this.time_taken = transportTime;
    this.endSimulation();
  }

  /**
   * Halt the application.
   *
   * @param {number} ms Number of milliseconds.
   * @returns {Promise<any>} Promise.
   */
  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate parameters for a step.
   *
   * @param transportTime Current transport time.
   * @returns {Promise<void>} Promise.
   */
  generate = async function (transportTime) {
    if (this.temperature_sensor_id !== null) {
      const temp = this.transportService.temperatureSimulation(transportTime);
      this.amCharts.updateChart(this.tempChart, () => {
        this.tempChart.dataProvider.push(temp);
        if (this.global.globalvars.current_simulation === 'DATABASE') {
          this.api.serverRequest({id: this.temperature_sensor_id, output: temp.temp.toFixed(2)}, "SENSOR_DATA").then(console.log("TEMP:" + temp.temp.toFixed(2)));
        }
      });
      this.checkThresholds(temp.temp, this.simulation_thresholds.temperature_low, this.simulation_thresholds.temperature_high, 'maxTemp');
    }
    if (this.accelerometer_sensor_id !== null) {
      const acc = this.transportService.accelerationSimulation(transportTime);
      this.amCharts.updateChart(this.accChart, () => {
        this.accChart.dataProvider.push(acc);
        if (this.global.globalvars.current_simulation === 'DATABASE') {
          this.api.serverRequest({
            id: this.accelerometer_sensor_id,
            output: acc.acc.toFixed(2)
          }, "SENSOR_DATA").then(console.log("ACC:" + acc.acc.toFixed(2)));
        }
      });
      this.checkThresholds(acc.acc, - this.simulation_thresholds.accelerometer, this.simulation_thresholds.accelerometer, 'acceleration');
    }
    if (this.humidity_sensor_id !== null) {
      const humid = this.transportService.humiditySimulation(transportTime);
      this.amCharts.updateChart(this.humidityChart, () => {
        this.humidityChart.dataProvider.push(humid);
        if (this.global.globalvars.current_simulation === 'DATABASE') {
          this.api.serverRequest({
            id: this.humidity_sensor_id,
            output: humid.humidity.toFixed(2)
          }, "SENSOR_DATA").then(console.log("HUMID:" + humid.humidity.toFixed(2)));
        }
      });
      this.checkThresholds(humid.humidity, this.simulation_thresholds.humidity_low, this.simulation_thresholds.humidity_high, 'humidity');
    }
    if (this.pressure_sensor_id !== null) {
      const pressure = this.transportService.pressureSimulation(transportTime);
      this.amCharts.updateChart(this.pressChart, () => {
        this.pressChart.dataProvider.push(pressure);
        if (this.global.globalvars.current_simulation === 'DATABASE') {
          this.api.serverRequest({
            id: this.pressure_sensor_id,
            output: pressure.press.toFixed(2)
          }, "SENSOR_DATA").then(console.log("PRES:" + pressure.press.toFixed(2)));
        }
      });
      this.checkThresholds(pressure.press, this.simulation_thresholds.pressure_low, this.simulation_thresholds.pressure_high, 'pressure');
    }
    if (this.gps_sensor_id !== null) {
      if (this.global.globalvars.current_simulation === 'DATABASE') {
        this.api.serverRequest({gps_id: this.gps_sensor_id, lat: this.direction.origin.lat, lng: this.direction.origin.lng}, "SENSOR_DATA").then();
      }
    }
  };

  /**
   * Checks if the threshold is violated.
   *
   * @param data Generated data.
   * @param low Lower threshold limit.
   * @param high Upper threshold limit.
   * @param sensor Current sensor.
   * @returns {Promise<void>} Promise.
   */
  checkThresholds = async function(data, low, high, sensor) {
    if (this.global.globalvars.current_simulation === 'BLOCKCHAIN') {
      if (sensor === 'maxTemp') {
        if (this.api.minTemp['set'] && data < low && !this.api['minTemp']['warning']) {
          console.log('minTemp', data, low, this.api['minTemp']['warning']);
          await this.api.sensorDataBlockchain(this.global.globalvars.agreement_id, 'minTemp', Math.floor(data));
          this.getSensorsBlockchain();
        }
      }
      if (this.api[sensor]['set'] && data > high && !this.api[sensor]['warning']) {
        console.log(sensor, data, high, this.api['minTemp']['warning']);
        await this.api.sensorDataBlockchain(this.global.globalvars.agreement_id, sensor, Math.ceil(data));
        this.getSensorsBlockchain();
      }
    }
    if ((data > high || data < low) && this.global.globalvars.current_simulation === 'DATABASE') {
      if (this.violated == false) {
        this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id}, "VIOLATE").then();
        this.violated = true;
      }
    }
  };

  /**
   * Ends a simulation.
   *
   * @returns {Promise<void>} Promise.
   */
  endSimulation = async function () {
    if (this.global.globalvars.current_simulation == 'DATABASE') {
      let state = 'DELIVERED';
      if (this.direct == 'RETURN') {
        state = 'RETURNED';
      }
      this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id, state: state}, "ALTER_STATE")
        .then(function() {document.getElementById("openModalButton").click()});
    } else {
      const state = await this.api.getState(this.global.globalvars.agreement_id);
      if (state == 2) {
        this.api.deliverBlockchain(this.global.globalvars.agreement_id);
      } else if (state == 5) {
        this.api.deliverReturnBlockchain(this.global.globalvars.agreement_id);
      }
    }
  };

  /**
   * Exits simulation by navigating to PostofficeComponent.
   */
  exitSimulation = function () {
    this.router.navigate(['']);
  }
}
