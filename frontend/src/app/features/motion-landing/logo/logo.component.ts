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
  selector: "aw-motion-logo",
  imports: [],
  templateUrl: "./logo.component.html",
  styleUrl: "./logo.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  readonly src = input("");
  readonly accent = input("#6d28ff");
}
