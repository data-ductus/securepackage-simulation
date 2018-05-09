import {Component, OnInit} from '@angular/core';
import {GlobalsService} from './services/globals.service';

@Component({selector: 'app-root', templateUrl: './app.component.html', styleUrls: ['./app.component.css']})
export class AppComponent implements OnInit {

  constructor (private global: GlobalsService) { }

  ngOnInit () {
  }

  /**
   * Changes global simulation variable.
   *
   * @param simulation Current simulation.
   */
  changeSim = function (simulation) {
    this.global.globalvars.current_simulation = simulation;
  }
}
