import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { Routes, RouterModule} from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { TransportService} from './services/transport.service';
import { Web3Service } from "./services/web3.service";

import { AppComponent } from './app.component';
import { SimulatorComponent } from './simulator/simulator.component';

import { AgmCoreModule } from '@agm/core';
import { AgmDirectionModule } from 'agm-direction';
import {AmChartsModule} from '@amcharts/amcharts3-angular';
import { PostofficeComponent } from './postoffice/postoffice.component';
import {ApiService} from './services/api.service';
import {GlobalsService} from './services/globals.service';
import {FormsModule} from '@angular/forms';
import {GeneratorService} from './services/generator.service';


const appRoutes: Routes = [
  { path: '', component: PostofficeComponent},
  { path: 'simulation', component: SimulatorComponent}];

@NgModule({
  declarations: [
    AppComponent,
    SimulatorComponent,
    PostofficeComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes),
    AgmCoreModule.forRoot({ // @agm/core
      apiKey: 'AIzaSyCnD7Sr2wMskuqjxVGjP8EpDnd7Olf6fCg'
    }),
    AgmDirectionModule,
    AmChartsModule,
    FormsModule
  ],
  providers: [TransportService, ApiService, GlobalsService, GeneratorService, Web3Service],
  bootstrap: [AppComponent]
})

export class AppModule { }
