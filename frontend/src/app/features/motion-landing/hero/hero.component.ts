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
  selector: "aw-motion-hero",
  imports: [IconComponent, LogoComponent],
  templateUrl: "./hero.component.html",
  styleUrl: "./hero.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {
  readonly content = input.required<LandingContent>();
  readonly replay = signal(0);
  readonly increment = (value: number) => value + 1;
  readonly letters = "awdevelop".split("");
  readonly tiles = [
    {
      image: "landing",
      title: "Seu negócio em destaque",
      alt: "Prévia ilustrativa de uma landing page",
    },
    {
      image: "platform",
      title: "Seu dia a dia mais simples",
      alt: "Prévia ilustrativa de uma plataforma de gestão",
    },
    {
      image: "automation",
      title: "Suas ferramentas conectadas",
      alt: "Prévia ilustrativa de uma automação",
    },
  ];
}
