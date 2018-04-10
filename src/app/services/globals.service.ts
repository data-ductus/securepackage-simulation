import { Injectable } from '@angular/core';

@Injectable()
export class GlobalsService {

  globalvars = {
    current_simulation: "DATABASE",
    simulation_running: false,
    agreement_id: "c7ae297b8826611310dd9d461d969426788d4fd4"
  };

  constructor() { }

}
