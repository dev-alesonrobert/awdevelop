import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({selector:'aw-legal',imports:[RouterLink],templateUrl:'./legal.component.html',styleUrl:'./legal.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class LegalComponent {
  readonly privacy=inject(ActivatedRoute).snapshot.data['privacy']===true;
}
