import { Component, OnInit } from '@angular/core';
import {JwtHelperService} from '@auth0/angular-jwt';
import { AuthService} from './_services/auth.service';
import * as jwt_decode from 'jwt-decode';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'app';

  constructor(private authService: AuthService){}

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (token){
      this.authService.decodedToken = jwt_decode(token);
    }
  }
}
