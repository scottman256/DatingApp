import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class HomeComponent implements OnInit {
registerMode = false;
values: any;
  constructor(private http: HttpClient, private route: ActivatedRoute) { }

  ngOnInit() {
    // The About page's "Register now" button links to /home?register=true to open the form straight away
    this.registerMode = this.route.snapshot.queryParamMap.get('register') === 'true';
  }

  registerToggle(){
    this.registerMode = true;
  }



cancelRegisterMode(registerMode: boolean) {
  this.registerMode = registerMode;
}


}
