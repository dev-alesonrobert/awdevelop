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
  selector: "aw-motion-portfolio",
  imports: [IconComponent, CarouselControlsComponent],
  templateUrl: "./portfolio.component.html",
  styleUrl: "./portfolio.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioComponent {
  readonly content = input.required<LandingContent>();
  readonly filter = signal("Todos");
  readonly slide = signal(0);
  readonly activeSlide = activeSlide;
  readonly goToSlide = goToSlide;
  readonly categories = computed(() => [
    "Todos",
    ...new Set(
      this.content().portfolio.projects.map((project) => project.category),
    ),
  ]);
  readonly projects = computed(() =>
    this.content().portfolio.projects.filter(
      (project) =>
        this.filter() === "Todos" || project.category === this.filter(),
    ),
  );
  readonly titles = computed(() =>
    this.projects().map((project) => project.title),
  );
  changeFilter(category: string, track: HTMLElement) {
    this.filter.set(category);
    this.slide.set(0);
    track.scrollTo({ left: 0, behavior: "instant" });
  }
}
