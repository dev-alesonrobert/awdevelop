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
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { apiMessage } from "../../../core/api";
import { LandingApiService, QuoteRequest } from "../landing-api.service";
@Component({
  selector: "aw-motion-contact",
  imports: [IconComponent, ReactiveFormsModule],
  templateUrl: "./contact.component.html",
  styleUrl: "./contact.component.scss",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  readonly content = input.required<LandingContent>();
  readonly preview = input(false);
  private readonly api = inject(LandingApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly pending = signal(false);
  readonly status = signal("");
  private readonly requestId = crypto.randomUUID();
  private submitted: QuoteRequest | null = null;
  readonly services = [
    "Landing page",
    "Site ou plataforma web",
    "Automação e integração",
    "Quero ajuda para definir",
  ];
  readonly form = this.fb.nonNullable.group({
    name: [
      "",
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    email: [
      "",
      [Validators.required, Validators.email, Validators.maxLength(200)],
    ],
    company: ["", Validators.maxLength(120)],
    phone: ["", Validators.maxLength(40)],
    service: ["", Validators.required],
    idea: [
      "",
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(2000),
      ],
    ],
    consent: [false, Validators.requiredTrue],
    website: ["", Validators.maxLength(200)],
  });
  chooseService(service: string) {
    if (!this.pending() && !this.busy() && !this.sent())
      this.form.controls.service.setValue(service);
  }
  async send() {
    if (this.busy() || this.sent() || this.preview()) return;
    if (!this.submitted && this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set("Confira os campos e a autorização de contato.");
      return;
    }
    this.submitted ??= {
      ...this.form.getRawValue(),
      requestId: this.requestId,
      stage: "Primeiro contato pelo site",
      timeline: "A definir",
    };
    this.pending.set(true);
    this.busy.set(true);
    this.status.set("");
    try {
      await firstValueFrom(this.api.sendQuote(this.submitted));
      if (!this.destroyRef.destroyed) {
        this.sent.set(true);
        this.status.set(
          "Solicitação recebida! Nossa equipe entrará em contato.",
        );
      }
    } catch (error) {
      if (!this.destroyRef.destroyed) this.status.set(apiMessage(error));
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
}
