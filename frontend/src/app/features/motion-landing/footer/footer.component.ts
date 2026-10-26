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
import { LogoComponent } from "../logo/logo.component";
@Component({
  selector: "aw-motion-footer",
  imports: [LogoComponent],
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  readonly content = input.required<LandingContent>();
  readonly year = new Date().getFullYear();
  readonly links = computed(() =>
    [
      { id: "servicos", label: "Soluções" },
      { id: "portfolio", label: "Portfólio" },
      { id: "processo", label: "Processo" },
      { id: "contato", label: "Contato" },
    ].filter(
      (link) =>
        !this.content().sections ||
        this.content().sections!.some((section) => section.id === link.id),
    ),
  );
}
