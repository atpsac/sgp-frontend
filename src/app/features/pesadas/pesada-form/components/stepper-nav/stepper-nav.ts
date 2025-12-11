import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

export interface WizardStep {
  id: number;
  label: string;
  hint?: string;
  disabled?: boolean;
  completed?: boolean;
}

@Component({
  selector: 'app-stepper-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stepper-nav.html',
  styleUrl: './stepper-nav.scss',
})
export class StepperNav {
  @Input() steps: WizardStep[] = [];
  @Input() currentStep = 1;

  /** Evento que emite el id del paso clickeado */
  @Output() stepChange = new EventEmitter<number>();

  onStepClick(step: WizardStep): void {
    // No permitir click si está deshabilitado
    if (step.disabled) {
      return;
    }
    this.stepChange.emit(step.id);
  }

  trackById(_index: number, item: WizardStep): number {
    return item.id;
  }
}
