import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, timeout } from "rxjs";
import { LandingContent } from "../../core/content-models";
export interface QuoteRequest {
  requestId: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  service: string;
  idea: string;
  stage: string;
  timeline: string;
  consent: boolean;
  website: string;
}
@Injectable({ providedIn: "root" })
export class LandingApiService {
  private readonly http = inject(HttpClient);
  load(
    preview: boolean,
    history: string | null,
  ): Observable<{ content?: LandingContent; draft?: LandingContent }> {
    const endpoint =
      history && /^\d+$/.test(history)
        ? "/api/admin/history/" + history
        : preview
          ? "/api/admin/content"
          : "/api/content";
    return this.http
      .get<{ content?: LandingContent; draft?: LandingContent }>(endpoint)
      .pipe(timeout(8000));
  }
  sendQuote(request: QuoteRequest) {
    return this.http.post("/api/quotes", request).pipe(timeout(15000));
  }
}
