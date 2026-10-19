import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../_services/auth.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AboutComponent {
  features = [
    {
      icon: 'fa-sliders',
      title: 'Matches that fit you',
      text: 'Choose the age range you\'re looking for, then sort by who joined most recently or who\'s been active lately. ' +
        'Your matches update the moment you apply a filter.'
    },
    {
      icon: 'fa-id-card-o',
      title: 'Profiles with personality',
      text: 'Every member has a photo gallery, their story, what they\'re looking for and their interests, ' +
        'so you know who you\'re talking to before you say hi.'
    },
    {
      icon: 'fa-heart',
      title: 'Let them know with a like',
      text: 'See someone special? Send a like with one tap. Your Lists page keeps track of who you\'ve liked and who likes you.'
    },
    {
      icon: 'fa-comments',
      title: 'Private conversations',
      text: 'Message any member straight from their profile. Your inbox shows what\'s unread, and you can see when your message has been read.'
    },
    {
      icon: 'fa-camera',
      title: 'Show your best side',
      text: 'Drag and drop your photos, pick the one everyone sees first, and change it whenever you like.'
    },
    {
      icon: 'fa-lock',
      title: 'Your privacy, protected',
      text: 'Only signed-in members can see profiles, only you and the person you\'re chatting with can read your messages, ' +
        'and your password is stored only as a secure hash.'
    }
  ];

  steps = [
    { title: 'Create your profile', text: 'Sign up in under a minute, then add your photos and tell people what makes you, you.' },
    { title: 'Discover your matches', text: 'Browse members who fit what you\'re looking for, and open any profile to learn more.' },
    { title: 'Start the conversation', text: 'Send a like or a message. When someone writes back, it lands right in your inbox.' }
  ];

  constructor(private authService: AuthService) { }

  loggedIn() {
    return this.authService.loggedIn();
  }
}
