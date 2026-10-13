import {Injectable} from '@angular/core';
import {User} from '../_models/user';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AlertifyService } from '../_services/alertify.service';
import { of, Observable } from 'rxjs';
import { UserService } from '../_services/user.service';
import { catchError } from 'rxjs/operators';
import { Message } from '../_models/message';
import { PaginatedResult } from '../_models/pagination';
import { AuthService } from '../_services/auth.service';

@Injectable()
export class MessagesResolver  {
    pageNumber = 1;
    pageSize =  5;
    messageContainer = 'Unread';

    constructor(private userService: UserService, private authService: AuthService,
                private router: Router, private alertify: AlertifyService) {}

        resolve(route: ActivatedRouteSnapshot): Observable<PaginatedResult<Message[]>> {
            return this.userService.getMessages(this.authService.decodedToken.nameid, this.pageNumber,
                 this.pageSize, this.messageContainer).pipe(
                catchError(error => {
                    this.alertify.error('Poblem retrieving messages');
                    this.router.navigate(['/home']);
                    return of(null);
                })
            );
        }
}
