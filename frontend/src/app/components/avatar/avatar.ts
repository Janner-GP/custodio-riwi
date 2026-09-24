import { Component, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  templateUrl: './avatar.html',
})
export class Avatar {
  hablando = input(false);
  bocaScale = input(1);
}
