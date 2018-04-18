import { Injectable } from '@angular/core';
import {Web3Service} from "./web3.service";

@Injectable()
export class GlobalsService {

  agreementDeliverJson = require('../../../build/contracts/purchase.json');
  agreementReturnJson = require('../../../build/contracts/purchase2.json');
  agreementDataJson = require('../../../build/contracts/purchaseData.json');
  tokenJson = require('../../../build/contracts/token.json');

  globalvars = {
    current_simulation: "DATABASE",
    simulation_running: false,
    agreement_id: "c7ae297b8826611310dd9d461d969426788d4fd4",
  };

  keys = {
    logistics: {
      'private': "c59bb835075113b1027fccb42838d7fa3cb8d41e56f0239f01849046e744534c",
      'public': "0x1Db698682F691d0604e33Ab803fb32533EAb5F39"
    },
    maxTemp: {
      'private': "c6fa9d1199255b77767da6f9deaef5b36bcb81982a1c0fb8e93345418ba7dbe0",
      'public': "0x8E2EdBBe6c3701a07fCD243726377E7fAa50DcC0"
    },
    minTemp: {
      'private': "40cdbebdb0e345a55aac8b9abbfa6f35f249e09f22067858396adc20bd38be76",
      'public': "0x74a80136C5530611F6F402e7639b2A0bd0e32926"
    },
    acceleration: {
      'private': "437b40dc5ef233ffadfc615f43ceeed11bafa19782e88dfa13a0931ed2e9192a",
      'public': "0x72da3538ED5b9f64D4E2B9A040cbbEfeACc283Be"
    },
    humidity: {
      'private': "aac28a7315c050295d248353ca4827c150c3a0060836a6b9501c3c1cab76679d",
      'public': "0x273125C65B45090aCbAd6e545CC3b825074Ea93a"
    },
    pressure: {
      'private': "45c96f3f905b3b7280c3ca4d2d14c3459710b551a0e1c87a6f773f9b08ac4d33",
      'public': "0x75b8a982eC411f40EB06dc210cD539b61D1405B7"
    }
  };

  contracts = {};


  constructor(private web3Service: Web3Service) { }

  async getContracts() {
    const agreementDeliverContract = await this.web3Service.artifactsToContract(this.agreementDeliverJson);
    const agreementReturnContract = await this.web3Service.artifactsToContract(this.agreementReturnJson);
    const agreementDataContract = await this.web3Service.artifactsToContract(this.agreementDataJson);
    const tokenContract = await this.web3Service.artifactsToContract(this.tokenJson);

    this.contracts['agreementDeliver'] = await this.web3Service.getContract(agreementDeliverContract.abi, '0x9cee638634ad959bff5f6a3674158df81646e845');
    this.contracts['agreementReturn'] = await this.web3Service.getContract(agreementReturnContract.abi, '0x73a7edd03715ff8989516af4e3a4b42be158f8a5');
    this.contracts['agreementData'] = await this.web3Service.getContract(agreementDataContract.abi, '0x189e8741ebb7e3e275e5f84700a118ac347b244e');
    this.contracts['token'] = await this.web3Service.getContract(tokenContract.abi, '0x2492ff0373197367f8503f201cefa484df7d8351');
  }
}
