import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperNav } from './stepper-nav';

describe('StepperNav', () => {
  let component: StepperNav;
  let fixture: ComponentFixture<StepperNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepperNav]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepperNav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
