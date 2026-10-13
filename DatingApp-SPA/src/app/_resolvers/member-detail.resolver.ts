import {Injectable} from '@angular/core';
import {User} from '../_models/user';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AlertifyService } from '../_services/alertify.service';
import { of, Observable } from 'rxjs';
import { UserService } from '../_services/user.service';
import { catchError } from 'rxjs/operators';

@Injectable()
export class MemberDetailResolver  {
    constructor(private userService: UserService,
                private router: Router, private alertify: AlertifyService) {}

        resolve(route: ActivatedRouteSnapshot): Observable<User> {
            return this.userService.getUser(route.params.id).pipe(
                catchError(error => {
                    this.alertify.error('Poblem retrieving data');
                    this.router.navigate(['/members']);
                    return of(null);
                })
            );
        }
}
