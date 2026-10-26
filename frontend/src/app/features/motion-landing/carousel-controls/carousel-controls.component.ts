import {
  Component,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  DestroyRef,
} from "@angular/core";
import { LandingContent } from "../../../core/content-models";

@Component({
  selector: "aw-motion-carousel-controls",
  imports: [],
  templateUrl: "./carousel-controls.component.html",
  styleUrl: "./carousel-controls.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselControlsComponent {
  readonly label = input.required<string>();
  readonly items = input.required<string[]>();
  readonly active = input(0);
  readonly navigate = output<number>();
}
