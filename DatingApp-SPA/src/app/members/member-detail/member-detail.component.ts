import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { User } from 'src/app/_models/user';
import { UserService } from 'src/app/_services/user.service';
import { AlertifyService } from 'src/app/_services/alertify.service';
import { ActivatedRoute } from '@angular/router';
import { NgxGalleryAnimation, NgxGalleryOptions, NgxGalleryImage } from 'ngx-gallery-15';
import { TabsetComponent } from 'ngx-bootstrap/tabs';
// import { NgxGalleryOptions, NgxGalleryImage, NgxGalleryAnimation } from 'ngx-gallery';

@Component({
  selector: 'app-member-detail',
  templateUrl: './member-detail.component.html',
  styleUrls: ['./member-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class MemberDetailComponent implements OnInit {
  @ViewChild('memberTabs', {static: true}) memberTabs: TabsetComponent;
  user: User;
  galleryOptions: NgxGalleryOptions[];
 galleryImages: NgxGalleryImage[];

  constructor(private userService: UserService, private alertify: AlertifyService,
              private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.user = data.user;
    });

    this.route.queryParams.subscribe(params => {
      // tslint:disable-next-line: no-string-literal
      const selectedTab = params['tab'];
      // ngx-bootstrap 20+ registers the tabs after ngOnInit, so select the tab once they exist
      setTimeout(() => this.memberTabs.tabs[selectedTab > 0 ? selectedTab : 0].active = true);
    });
    this.galleryOptions = [
{
  width: '500px',
  height: '500px',
  imagePercent: 100,
  thumbnailsColumns: 4,
  imageAnimation: NgxGalleryAnimation.Slide,
  preview: false
}
];
    this.galleryImages = this.getImages();
  }

getImages(){
  const imageUrls = [];
  for (const photo of this.user.photos){
    imageUrls.push(
      {
        small: photo.url,
        medium: photo.url,
        large: photo.url,
        description: photo.description
      }
    );
  }
  return imageUrls;
}

  loadUser(){
    this.userService.getUser(+this.route.snapshot.params.id).subscribe((user: User) => {
    this.user = user;
  }, error => {
    this.alertify.error(error);
  });
  }

  selectTab(tabId: number) {
    this.memberTabs.tabs[tabId].active = true;
  }
}
