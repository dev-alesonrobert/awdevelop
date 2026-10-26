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
  selector: "aw-motion-process",
  imports: [],
  templateUrl: "./process.component.html",
  styleUrl: "./process.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessComponent {
  readonly content = input.required<LandingContent>();
  readonly steps = computed(() =>
    [
      ["Alinhamento & estratégia", "Entendemos o que você precisa."],
      ["Design UI/UX", "Você visualiza e aprova a ideia."],
      ["Desenvolvimento & automação", "Construímos e conectamos tudo."],
      ["Entrega & otimização", "Seu projeto pronto para evoluir."],
    ].map(([title, text], i) => ({
      title: this.content().blocks["motion-step-" + i + "-title"] || title,
      text: this.content().blocks["motion-step-" + i + "-copy"] || text,
    })),
  );
}
