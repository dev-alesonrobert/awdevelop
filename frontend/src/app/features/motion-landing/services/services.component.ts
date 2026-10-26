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
import { CarouselControlsComponent } from "../carousel-controls/carousel-controls.component";
import { activeSlide, goToSlide } from "../carousel";
@Component({
  selector: "aw-motion-services",
  imports: [IconComponent, CarouselControlsComponent],
  templateUrl: "./services.component.html",
  styleUrl: "./services.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent {
  readonly content = input.required<LandingContent>();
  readonly selectService = output<string>();
  readonly slide = signal(0);
  readonly activeSlide = activeSlide;
  readonly goToSlide = goToSlide;
  readonly services = computed(() =>
    [
      {
        icon: "cursor",
        title: "Landing pages",
        short: "Landing page",
        text: "Apresente sua oferta. Conquiste novos clientes.",
        label: "Converter mais",
      },
      {
        icon: "window",
        title: "Sites & plataformas",
        short: "Site ou plataforma web",
        text: "Sua empresa online, com tudo o que precisa.",
        label: "Fortalecer minha presença",
      },
      {
        icon: "nodes",
        title: "Automações & integrações",
        short: "Automação e integração",
        text: "Conecte ferramentas e simplifique sua rotina.",
        label: "Automatizar minha operação",
      },
    ].map((item, index) => ({
      ...item,
      title:
        this.content().blocks["motion-service-" + index + "-title"] ||
        item.title,
      text:
        this.content().blocks["motion-service-" + index + "-copy"] || item.text,
    })),
  );
  readonly titles = computed(() => this.services().map((item) => item.title));
}
