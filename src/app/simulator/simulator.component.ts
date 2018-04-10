import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AmChartsService, AmChart } from '@amcharts/amcharts3-angular';
import { TransportService} from '../services/transport.service';
import {ApiService} from '../services/api.service';
import {GlobalsService} from '../services/globals.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-simulator',
  templateUrl: './simulator.component.html',
  styleUrls: ['./simulator.component.css']
})
export class SimulatorComponent implements OnInit {

  direction;
  waypoints;
  time_taken;

  private tempChart: AmChart;
  private pressChart: AmChart;
  private accChart: AmChart;
  private humidityChart: AmChart;

  accelerometer_sensor_id = null;
  pressure_sensor_id = null;
  temperature_sensor_id = null;
  humidity_sensor_id = null;
  gps_sensor_id = null;

  violated = false;

  simulation_thresholds;

  direct;
  origin;
  destination;

  time = [];
  tempData = [];
  accData = [];
  pressData = [];
  humidityData = [];

  stepDuration = 120;

  loc = {
    lat: 24.799448,
    lng: 120.979021,
  };

  directionUrl = '';

  constructor(private router: Router, private route: ActivatedRoute, private http: HttpClient, private amCharts: AmChartsService, private transportService: TransportService, private api: ApiService, private global: GlobalsService) { }

  ngOnInit() {
    this.initSimulation();
  }

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

  initSimulation = function() {
    this.api.serverRequest({id: this.global.globalvars.agreement_id}, "FETCH_AGREEMENT_INFO").then(data => {
      this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id, current_status: data.state}, "CHECK_RETURN").then(data => {
        this.direct = data;
        this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id, direction: this.direct}, "FETCH_LOGISTICS_PARAMETERS").then(response => {
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
          let request_payload = {agreement_id: this.global.globalvars.agreement_id, direction: this.direct, current_status: data.state};
          this.api.serverRequest(request_payload, "FETCH_LOGISTICS_BUYER").then(data => {
            this.destination = data.street_address + " " + data.city;
            this.api.serverRequest(request_payload, "FETCH_LOGISTICS_SELLER").then(data => {
              this.origin = data.street_address + " " + data.city;
              this.directionUrl = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + this.origin + '&destination=' +
                this.destination + '&key=AIzaSyCnD7Sr2wMskuqjxVGjP8EpDnd7Olf6fCg'.replace(/ /g,"+");
              this.api.serverRequest(request_payload, "FETCH_SIMULATION_THRESHOLDS").then(data => {
                this.simulation_thresholds = data;
                this.initCharts();
                this.getGeoCodeDirection();
              });
            });
          });
        });
      });
    });


  };

  startSimulation = function () {
    //document.getElementById("simStartButton").disabled = true;
    this.step();
  };

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

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generate = function (transportTime) {
    if (this.temperature_sensor_id !== null) {
      const temp = this.transportService.temperatureSimulation(transportTime);
      this.amCharts.updateChart(this.tempChart, () => {
        this.tempChart.dataProvider.push(temp);
        this.api.serverRequest({id: this.temperature_sensor_id, output: temp.temp.toFixed(2)}, "SENSOR_DATA").then(console.log("TEMP:" + temp.temp.toFixed(2)));
      });
      this.checkThresholds(temp.temp, this.simulation_thresholds.temperature_low, this.simulation_thresholds.temperature_high);
    }
    if (this.accelerometer_sensor_id !== null) {
      const acc = this.transportService.accelerationSimulation(transportTime);
      this.amCharts.updateChart(this.accChart, () => {
        this.accChart.dataProvider.push(acc);
        this.api.serverRequest({id: this.accelerometer_sensor_id, output: acc.acc.toFixed(2)}, "SENSOR_DATA").then(console.log("ACC:" + acc.acc.toFixed(2)));
      });
      this.checkThresholds(acc.acc, - this.simulation_thresholds.accelerometer, this.simulation_thresholds.accelerometer);
    }
    if (this.humidity_sensor_id !== null) {
      const humid = this.transportService.humiditySimulation(transportTime);
      this.amCharts.updateChart(this.humidityChart, () => {
        this.humidityChart.dataProvider.push(humid);
        this.api.serverRequest({id: this.humidity_sensor_id, output: humid.humidity.toFixed(2)}, "SENSOR_DATA").then(console.log("HUMID:" + humid.humidity.toFixed(2)));
      });
      this.checkThresholds(humid.humidity, this.simulation_thresholds.humidity_low, this.simulation_thresholds.humidity_high);
    }
    if (this.pressure_sensor_id !== null) {
      const pressure = this.transportService.pressureSimulation(transportTime);
      this.amCharts.updateChart(this.pressChart, () => {
        this.pressChart.dataProvider.push(pressure);
        this.api.serverRequest({id: this.pressure_sensor_id, output: pressure.press.toFixed(2)}, "SENSOR_DATA").then(console.log("PRES:" + pressure.press.toFixed(2)));
      });
      this.checkThresholds(pressure.press, this.simulation_thresholds.pressure_low, this.simulation_thresholds.pressure_high);
    }
    if (this.gps_sensor_id !== null) {
      this.api.serverRequest({gps_id: this.gps_sensor_id, lat: this.direction.origin.lat, lng: this.direction.origin.lng}, "SENSOR_DATA").then();
    }
  };

  checkThresholds = function(data, low, high) {
    if (data > high || data < low) {
      this.violated = true;
      this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id}, "VIOLATE").then();
    }
  };

  endSimulation = function () {
    let state = 'DELIVERED';
    if (this.direct == 'RETURN') {
      state = 'RETURNED';
    }
    this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id, state: state}, "ALTER_STATE")
      .then(function() {document.getElementById("openModalButton").click()});
  };

  exitSimulation = function () {
    this.router.navigate(['']);
  }
}
