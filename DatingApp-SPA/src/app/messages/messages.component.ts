import { Component, OnInit } from '@angular/core';
import { Pagination, PaginatedResult } from '../_models/pagination';
import { ActivatedRoute } from '@angular/router';
import { AlertifyService } from '../_services/alertify.service';
import { Message } from '../_models/message';
import { UserService } from '../_services/user.service';
import { AuthService } from '../_services/auth.service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
  standalone: false
})

export class MessagesComponent implements OnInit {
  messages: Message[];
  pagination: Pagination;
  messageContainer = 'Unread';


  constructor(private userService: UserService, private authService: AuthService,
              private route: ActivatedRoute, private alertify: AlertifyService) { }

  ngOnInit() {
    this.route.data.subscribe( data => {
      this.messages = data.messages.result;
      this.pagination = data.messages.pagination;
    });
  }

  Inbox() {
    this.messageContainer = 'Inbox';
    this.loadMessages();
  }

  Outbox(){
    this.messageContainer = 'Outbox';
    this.loadMessages();
  }

  Unread()
  {
    this.messageContainer = 'Unread';
    this.loadMessages();
  }

deleteMessage(id: number) {
  this.alertify.confirm('Are you sure that you want to delete this message', () => {
    this.userService.deleteMessage(id, this.authService.decodedToken.nameid).subscribe(() => {
      this.messages.splice(this.messages.findIndex(m => m.id === id), 1);
      this.alertify.success('Message has been deleted');
    }, error => {
      this.alertify.error('Failed to delete the message');
    });
  });
}

loadMessages() {
  this.userService.getMessages(this.authService.decodedToken.nameid, this.pagination.currentPage,
    this.pagination.itemsPerPage, this.messageContainer)
    .subscribe((res: PaginatedResult<Message[]>) => {
      this.messages = res.result;
      this.pagination = res.pagination;
    }, error => {
      this.alertify.error(error);
    });
    }

    pageChanged(event: any): void {
      this.pagination.currentPage  = event.page;
      this.loadMessages();
    }
}


