import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatChipOption, MatChipListbox } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

export interface AiFillRequest {
  text: string;
  supplierText: string;
  overwrite: boolean;
}

/** "Fill with AI" panel of the product editor (presentational; the editor calls the API) */
@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButton,
    MatIconButton,
    MatCheckbox,
    MatChipListbox,
    MatChipOption,
    MatExpansionModule,
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
    MatIcon,
    MatProgressSpinner,
  ],
})
export class AiAssistantComponent {
  /** Photos the AI will look at */
  readonly imageCount = input(0);
  readonly busy = input(false);
  readonly error = input('');
  readonly warnings = input<string[]>([]);
  readonly suggestedCategories = input<string[]>([]);
  /** Number of AI-filled fields not reviewed yet */
  readonly pendingCount = input(0);
  /** Existing products: offer to replace texts that are already filled */
  readonly existingProduct = input(false);
  readonly uploading = input(false);
  /** Starts collapsed for existing products */
  readonly expanded = input(true);

  readonly fill = output<AiFillRequest>();
  readonly cancelFill = output<void>();
  readonly addCategory = output<string>();
  readonly acceptAll = output<void>();
  readonly dismissWarnings = output<void>();

  readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  text = '';
  supplierText = '';
  overwrite = false;
  readonly elapsed = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  readonly canFill = computed(() => !this.busy() && !this.uploading());
  readonly busyMessage = computed(() => {
    const photos = this.imageCount();
    const seconds = this.elapsed();
    const what = photos ? `Looking at ${photos} photo${photos > 1 ? 's' : ''} and writing` : 'Writing';
    return `${what} the texts in all languages… ${seconds ? seconds + ' s' : ''}`.trim();
  });

  constructor() {
    effect(() => {
      clearInterval(this.timer);
      this.elapsed.set(0);
      if (this.busy() && typeof window !== 'undefined') {
        this.timer = setInterval(() => this.elapsed.update((s) => s + 1), 1000);
      }
    });
  }

  submit(): void {
    if (!this.canFill()) return;
    if (!this.imageCount() && !this.text.trim() && !this.supplierText.trim()) return;
    this.fill.emit({ text: this.text.trim(), supplierText: this.supplierText.trim(), overwrite: this.overwrite });
  }

  hasInput(): boolean {
    return !!this.imageCount() || !!this.text.trim() || !!this.supplierText.trim();
  }

  /** Moves focus to the result summary once the form is filled (called by the editor) */
  focusSummary(): void {
    setTimeout(() => this.summary()?.nativeElement.focus());
  }
}
