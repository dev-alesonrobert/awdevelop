import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  DestroyRef,
  inject,
  signal,
  computed,
  viewChild,
} from "@angular/core";
import { Title, Meta } from "@angular/platform-browser";
import { firstValueFrom } from "rxjs";
import { LandingContent } from "../../core/content-models";
import { LandingApiService } from "./landing-api.service";
import { initialSections } from "../sections/models";
import defaults from "../../../../../dist/content-default.json";
import { HeaderComponent } from "./header/header.component";
import { HeroComponent } from "./hero/hero.component";
import { ServicesComponent } from "./services/services.component";
import { PortfolioComponent } from "./portfolio/portfolio.component";
import { ProcessComponent } from "./process/process.component";
import { ContactComponent } from "./contact/contact.component";
import { FooterComponent } from "./footer/footer.component";
import { ExtraSectionComponent } from "./extra-section/extra-section.component";
@Component({
  selector: "aw-motion-landing",
  imports: [
    HeaderComponent,
    HeroComponent,
    ServicesComponent,
    PortfolioComponent,
    ProcessComponent,
    ContactComponent,
    FooterComponent,
    ExtraSectionComponent,
  ],
  templateUrl: "./motion-landing.component.html",
  styleUrl: "./motion-landing.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotionLandingComponent {
  private readonly api = inject(LandingApiService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  readonly contact = viewChild(ContactComponent);
  readonly content = signal<LandingContent | null>(null);
  readonly message = signal("");
  readonly preview = signal(false);
  readonly sections = computed(
    () => this.content()?.sections ?? initialSections(),
  );
  constructor() {
    void this.load();
  }
  private async load() {
    const query = new URLSearchParams(location.search),
      history = query.get("history");
    this.preview.set(query.get("preview") === "1" || !!history);
    let content: LandingContent;
    try {
      const result = await firstValueFrom(
        this.api.load(this.preview(), history),
      );
      const loaded = result.draft ?? result.content;
      if (!loaded) throw new Error("Conteúdo indisponível");
      content = loaded;
    } catch {
      if (this.preview()) {
        if (!this.destroyRef.destroyed)
          this.message.set("Entre no painel para visualizar este rascunho.");
        return;
      }
      content = defaults as LandingContent;
    }
    if (this.destroyRef.destroyed) return;
    this.content.set(content);
    this.title.setTitle(content.settings.title);
    this.meta.updateTag({
      name: "description",
      content: content.settings.description,
    });
  }
}
