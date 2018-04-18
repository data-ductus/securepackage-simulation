import {Component, OnInit} from '@angular/core';
import {GlobalsService} from './services/globals.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';

  constructor (private global: GlobalsService) { }

  ngOnInit () {
  }

  changeSim = function (simulation) {
    this.global.globalvars.current_simulation = simulation;
  }
}
