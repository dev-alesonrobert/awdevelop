import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiMessage } from '../../core/api';
@Component({ selector: 'aw-media-picker', imports: [], templateUrl: './media-picker.component.html', styleUrl: './media-picker.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class MediaPickerComponent {
    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);
    readonly selected = output<string>();
    readonly working = output<boolean>();
    readonly items = signal<{
        id: string;
        url: string;
        label: string;
    }[]>([]);
    readonly open = signal(false);
    readonly busy = signal(false);
    readonly message = signal('');
    async toggle() { this.open.update(x => !x); if (this.open())
        await this.load(); }
    async load() { try {
        const data = await firstValueFrom(this.http.get<{
            items: {
                id: string;
                url: string;
                label: string;
            }[];
        }>('/api/admin/media'));
        if (!this.destroyRef.destroyed)
            this.items.set(data.items);
    }
    catch (e) {
        this.message.set(apiMessage(e));
    } }
    choose(url: string) { this.selected.emit(url); this.open.set(false); }
    async upload(event: Event) {
        const field = event.target as HTMLInputElement, file = field.files?.[0];
        if (!file || this.busy())
            return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4194304) {
            this.message.set('Use PNG, JPG ou WebP até 4 MB.');
            field.value = '';
            return;
        }
        this.busy.set(true);
        this.working.emit(true);
        this.message.set('');
        try {
            const data = await firstValueFrom(this.http.post<{
                url: string;
            }>('/api/admin/upload', file, { headers: { 'Content-Type': file.type } }));
            if (!this.destroyRef.destroyed) {
                this.working.emit(false);
                this.selected.emit(data.url);
                await this.load();
                this.message.set('Imagem enviada.');
            }
        }
        catch (e) {
            if (!this.destroyRef.destroyed)
                this.message.set(apiMessage(e));
        }
        finally {
            this.busy.set(false);
            this.working.emit(false);
            field.value = '';
        }
    }
}
