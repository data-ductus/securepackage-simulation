import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { Web3Service } from "./web3.service";
import {GlobalsService} from "./globals.service";

@Injectable()
export class ApiService {

  servertarget = 'http://localhost/securepackage_api/api_main.php';
  account;

  maxTemp;
  minTemp;
  acceleration;
  humidity;
  pressure;

  contracts = this.global.contracts;

  constructor(private http: HttpClient, private web3Service: Web3Service, private global: GlobalsService) {
    this.watchAccount()
  }

  serverRequest = function (payload, action) {
    payload.action = action;
    let promise = new Promise((resolve) => {
      this.http.post(this.servertarget, payload).subscribe(data => {
        console.log(data);
        resolve(data);})
    });
    return promise;
  };

  async getSensorsBlockchain(id) {
    try {
      this.maxTemp = await this.contracts['agreementData'].methods.getSensor(id, 'maxTemp').call();
      this.minTemp = await this.contracts['agreementData'].methods.getSensor(id, 'minTemp').call();
      this.acceleration = await this.contracts['agreementData'].methods.getSensor(id, 'acceleration').call();
      this.humidity = await this.contracts['agreementData'].methods.getSensor(id, 'humidity').call();
      this.pressure = await this.contracts['agreementData'].methods.getSensor(id, 'pressure').call();
      return {maxTemp: this.maxTemp, minTemp: this.minTemp, acc: this.acceleration, hum: this.humidity, press: this.pressure};
    } catch (e) {
      console.log(e);
    }
  }

  async getState(id) {
    return this.contracts['agreementData'].methods.state(id).call();
  }

  async getDeliveryAddress(id) {
    const buyer = await this.contracts['agreementData'].methods.buyer(id).call();
    return this.contracts['agreementData'].methods.deliveryAddress(id, buyer).call();
  }

  async getReturnAddress(id) {
    return this.contracts['agreementData'].methods.returnAddress(id).call();
  }

  async setProviders(id) {
    if (this.maxTemp['set']) {
      await this.setProvider(id, 'maxTemp');
    }
    if (this.acceleration['set']) {
      await this.setProvider(id, 'acceleration');
    }
    if (this.humidity['set']) {
      await this.setProvider(id, 'humidity');
    }
    if (this.pressure['set']) {
      await this.setProvider(id, 'pressure');
    }
    if (this.minTemp['set']) {
      await this.setProvider(id, 'minTemp');
    }
  }

  async setProvider(id, sensor) {
    const gas =  await this.contracts['agreementDeliver'].methods.setProvider(id, sensor).estimateGas({from: this.global.keys[sensor].public});
    const abi = await this.contracts['agreementDeliver'].methods.setProvider(id, sensor).encodeABI();
    this.web3Service.signAndSend(abi, this.contracts['agreementDeliver']['_address'], this.global.keys[sensor].private, gas, this.global.keys[sensor].public);
  }

  async transportBlockchain(id, returnAddress) {
    const gas = await this.contracts['agreementDeliver'].methods.transport(id, returnAddress).estimateGas({from: this.global.keys.logistics.public});
    const abi = await this.contracts['agreementDeliver'].methods.transport(id, returnAddress).encodeABI();
    this.web3Service.signAndSend(abi, this.contracts['agreementDeliver']['_address'], this.global.keys.logistics.private, gas, this.global.keys.logistics.public)
  }

  async sensorDataBlockchain(id, sensor, data) {
    const gas = await this.contracts['agreementDeliver'].methods.sensorData(id, sensor, data).estimateGas({from: this.global.keys[sensor].public});
    const abi = await this.contracts['agreementDeliver'].methods.sensorData(id, sensor, data).encodeABI();
    this.web3Service.signAndSend(abi, this.contracts['agreementDeliver']['_address'], this.global.keys[sensor].private, gas, this.global.keys[sensor].public)
  }

  async deliverBlockchain(id) {
    const gas = await this.contracts['agreementDeliver'].methods.deliver(id).estimateGas({from: this.global.keys.logistics.public});
    const abi = await this.contracts['agreementDeliver'].methods.deliver(id).encodeABI();
    this.web3Service.signAndSend(abi, this.contracts['agreementDeliver']['_address'], this.global.keys.logistics.private, gas, this.global.keys.logistics.public)
  }

  watchAccount() {
    this.web3Service.accountsObservable.subscribe((accounts) => {
      this.account = accounts[0];
    });

  }
}
