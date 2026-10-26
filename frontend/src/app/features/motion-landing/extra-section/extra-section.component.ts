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
import { IconComponent } from "../icon/icon.component";
import { LandingSection } from "../../sections/models";
@Component({
  selector: "aw-motion-extra-section",
  imports: [IconComponent],
  templateUrl: "./extra-section.component.html",
  styleUrl: "./extra-section.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtraSectionComponent {
  readonly content = input.required<LandingContent>();
  readonly section = input.required<LandingSection>();
  readonly pillars = [
    { icon: "window", title: "Desenvolvimento sob medida" },
    { icon: "bolt", title: "SEO & performance" },
    { icon: "nodes", title: "Automação de processos" },
  ];
}
