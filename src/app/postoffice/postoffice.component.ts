import { Component, OnInit } from '@angular/core';
import {GlobalsService} from '../services/globals.service';
import {ApiService} from '../services/api.service';
import {GeneratorService} from '../services/generator.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-postoffice',
  templateUrl: './postoffice.component.html',
  styleUrls: ['./postoffice.component.css']
})
export class PostofficeComponent implements OnInit {

  item_fetched;

  agreement_logistics_data = {};
  agreement_seller_data = {};
  agreement_buyer_data = {};

  package_id;
  direction;

  package_weight : number;
  sensor_count : number;
  logistics_cost : number;

  accelerometer_sensor_id = null;
  pressure_sensor_id = null;
  temperature_sensor_id = null;
  humidity_sensor_id = null;
  gps_sensor_id = null;

  constructor(private global: GlobalsService, private api: ApiService, private generator: GeneratorService,
              private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.global.getContracts();
    this.global.globalvars.current_simulation = "DATABASE";
    this.sensor_count = 0;
    this.logistics_cost = 0;
    this.package_weight = 0;
    this.package_id = this.generator.generatePackageID();
  }

  fetchAgreementData = function () {
    if (this.global.globalvars.current_simulation === 'DATABASE') {
      let request_payload = {agreement_id: this.global.globalvars.agreement_id, current_status: "LOCKED"};
      this.api.serverRequest(request_payload, "FETCH_LOGISTICS_INFO").then(data => {
        if (data.state == "LOCKED" || data.state == "REJECTED") {
          this.agreement_logistics_data = data;
          let buyer_request_payload = {buyer_id: data.buyer_id};
          let seller_request_payload = {seller_id: data.seller_id};
          if (data.state == "REJECTED") {
            buyer_request_payload = {buyer_id: data.seller_id};
            seller_request_payload = {seller_id: data.buyer_id};
          }
          this.api.serverRequest(seller_request_payload, "FETCH_LOGISTICS_SELLER").then(seller_data => this.agreement_seller_data = seller_data);
          this.api.serverRequest(buyer_request_payload, "FETCH_LOGISTICS_BUYER").then(buyer_data => this.agreement_buyer_data = buyer_data);
          this.api.serverRequest(request_payload, "CHECK_RETURN").then( data => this.direction = data);

          this.generateSensors();
          this.updateLogisticsCost();
          this.item_fetched = true;
        }
        else {
          this.item_fetched = false;
        }
      })
    } else if (this.global.globalvars.current_simulation === 'BLOCKCHAIN') {
      this.fetchBlockchainData();
    }
  };

  async fetchBlockchainData() {
    this.item_fetched = false;
    const state = await this.api.getState(this.global.globalvars.agreement_id);
    this.getSensorsBlockchain();
    if (state == 1) {
      this.agreement_buyer_data['city'] = await this.api.getDeliveryAddress(this.global.globalvars.agreement_id);
      await this.api.setProviders(this.global.globalvars.agreement_id);
      this.getSensorsBlockchain();
      this.item_fetched = true;
    } else if (state == 4) {
      this.item_fetched = true;
    }
  }

  async getSensorsBlockchain() {
    const sensors = await this.api.getSensorsBlockchain(this.global.globalvars.agreement_id);
    this.pressure_sensor_id = sensors['press']['set'] ? sensors['press']['provider']: null;
    this.humidity_sensor_id = sensors['hum']['set'] ? sensors['hum']['provider']: null;
    this.accelerometer_sensor_id = sensors['acc']['set'] ? sensors['acc']['provider']: null;
    this.temperature_sensor_id = sensors['maxTemp']['set'] ? sensors['maxTemp']['provider']: null;
    this.temperature_sensor_id = sensors['minTemp']['set'] ? sensors['minTemp']['provider']: this.temperature_sensor_id;

    this.agreement_logistics_data['accelerometer'] = sensors['acc']['threshold'];
    this.agreement_logistics_data['pressure_high'] = sensors['press']['threshold'];
    this.agreement_logistics_data['humidity_high'] = sensors['hum']['threshold'];
    this.agreement_logistics_data['temperature_high'] = sensors['maxTemp']['threshold'];
    this.agreement_logistics_data['temperature_low'] = sensors['minTemp']['threshold'];
  }

  generateSensors = function() {
    if (this.agreement_logistics_data.accelerometer !== null) {
      this.accelerometer_sensor_id = this.generator.generate160bitId();
      this.sensor_count++;
    }
    if (this.agreement_logistics_data.pressure_low !== null) {
      this.pressure_sensor_id = this.generator.generate160bitId();
      this.sensor_count++;
    }
    if (this.agreement_logistics_data.temperature_low !== null) {
      this.temperature_sensor_id = this.generator.generate160bitId();
      this.sensor_count++;
    }
    if (this.agreement_logistics_data.humidity_low !== null) {
      this.humidity_sensor_id = this.generator.generate160bitId();
      this.sensor_count++;
    }
    if(this.agreement_logistics_data.gps == "1") {
      this.gps_sensor_id = this.generator.generate160bitId();
      this.sensor_count++;
    }
  };

  updateLogisticsCost = function () {
    this.logistics_cost = (this.package_weight * 59) + (this.sensor_count * 10);
  };

  sendPackage = async function () {
    if (this.global.globalvars.current_simulation === 'DATABASE') {
      let request_payload = {
        kolli_id: this.package_id,
        agreement_id: this.global.globalvars.agreement_id,
        item_weight: this.package_weight,
        logistics_cost: this.logistics_cost,
        acc_sensor_id: this.accelerometer_sensor_id,
        temp_sensor_id: this.temperature_sensor_id,
        humid_sensor_id: this.humidity_sensor_id,
        pres_sensor_id: this.pressure_sensor_id,
        gps_sensor_id: this.gps_sensor_id,
        direction: this.direction
      };
      let state = 'TRANSIT';
      if (this.direction == "RETURN") { state = 'RETURN'; }
      this.api.serverRequest({agreement_id: this.global.globalvars.agreement_id, state: state}, "ALTER_STATE")
        .then(this.api.serverRequest(request_payload, "START_LOGISTICS_PROCESS").then(data => {
          if (data == this.sensor_count) {
            this.router.navigate(['simulation']);
          }
        }));
    } else if (this.global.globalvars.current_simulation === 'BLOCKCHAIN') {
      const state = await this.api.getState(this.global.globalvars.agreement_id);
      if (state == 2) {
        this.api.transportBlockchain(this.global.globalvars.agreement_id, this.randomCity());
      } else if (state == 5) {
        this.api.transportReturnBlockchain(this.global.globalvars.agreement_id);
      }
      this.router.navigate(['simulation']);
    }
  };

  randomCity() {
    const cities = ['Stockholm', 'Malmö', 'Göteborg', 'Uppsala', 'Sundsvall'];
    return cities[Math.floor(Math.random()*5)]
  }
}

