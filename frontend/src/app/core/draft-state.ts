import { Injectable, signal } from '@angular/core';
@Injectable({
    providedIn: 'root'
})
export class DraftState {
    readonly pending = signal(false);
    readonly working = signal(false);
}
