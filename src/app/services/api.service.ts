import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';

@Injectable()
export class ApiService {

  servertarget = 'http://localhost/securepackage_api/api_main.php';

  constructor(private http: HttpClient) { }

  serverRequest = function (payload, action) {
    payload.action = action;
    let promise = new Promise((resolve) => {
      this.http.post(this.servertarget, payload).subscribe(data => {
        console.log(data);
        resolve(data);})
    });
    return promise;
  }

}
