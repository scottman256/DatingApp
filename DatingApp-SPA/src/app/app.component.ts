import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {JwtHelperService} from '@auth0/angular-jwt';
import { AuthService} from './_services/auth.service';
import jwt_decode from 'jwt-decode';
import { User } from './_models/user';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AppComponent implements OnInit{
  title = 'app';

  constructor(private authService: AuthService){}

  ngOnInit() {
    const token = localStorage.getItem('token');
    const user: User = JSON.parse(localStorage.getItem('user'));
    if (token){
      this.authService.decodedToken = jwt_decode(token);
    }
    if (user) {
      this.authService.currentUser = user;
      this.authService.changeMemberPhoto(user.photoUrl);
    }
  }
}
