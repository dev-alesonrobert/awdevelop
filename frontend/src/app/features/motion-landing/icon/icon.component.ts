import {
  Component,
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
  selector: "aw-motion-icon",
  imports: [],
  templateUrl: "./icon.component.html",
  styleUrl: "./icon.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly type = input("arrow");
  readonly size = input(20);
}
