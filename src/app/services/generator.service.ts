import { Injectable } from '@angular/core';

/* GeneratorService: contains helper function for time, hash, ID and byte array generation */

@Injectable()

export class GeneratorService {

  constructor() { }

  /**
   * Generates a 160-bit identification number.
   *
   * @returns {string} 160-bit identifier.
   */
  generate160bitId = function() {
    let id = "";
    let possible = "0123456789abcdef";

    for (let i = 0; i < 40; i++)
      id += possible.charAt(Math.floor(Math.random() * possible.length));

    return id;
  };

  /**
   * Generates current time in MySQL format.
   *
   * @returns {string} Current time in MySQL format.
   */
  generateCurrentTime = function() {
    let now     = new Date();
    let year    = now.getFullYear().toString();
    let month   = (now.getMonth()+1).toString();
    let day     = now.getDate().toString();
    let hour    = now.getHours().toString();
    let minute  = now.getMinutes().toString();
    let second  = now.getSeconds().toString();
    if(month.toString().length == 1) {
      month = '0' + month;
    }
    if(day.toString().length == 1) {
      day = '0' + day;
    }
    if(hour.toString().length == 1) {
      hour = '0' + hour;
    }
    if(minute.toString().length == 1) {
      minute = '0' + minute;
    }
    if(second.toString().length == 1) {
      second = '0' + second;
    }
    let dateTime = "'"+year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second+"'";
    return dateTime;
  };

  /**
   * Generates logistics identifier.
   *
   * @returns {string} Current time in MySQL format.
   */
  generatePackageID = function() {
    let id = "SE";
    let possible = "0123456789";

    for (let i = 0; i < 12; i++)
      id += possible.charAt(Math.floor(Math.random() * possible.length));

    return id;
  }
}
