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
import { IconComponent } from "../icon/icon.component";
import { LogoComponent } from "../logo/logo.component";
@Component({
  selector: "aw-motion-header",
  imports: [IconComponent, LogoComponent],
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly content = input.required<LandingContent>();
  readonly open = signal(false);
  readonly links = computed(() =>
    [
      { id: "servicos", label: "Soluções" },
      { id: "portfolio", label: "Portfólio" },
      { id: "processo", label: "Como trabalhamos" },
      { id: "contato", label: "Vamos conversar" },
    ].filter(
      (link) =>
        !this.content().sections ||
        this.content().sections!.some((section) => section.id === link.id),
    ),
  );
}
