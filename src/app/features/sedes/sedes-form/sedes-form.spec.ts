import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SedesForm } from './sedes-form';

describe('SedesForm', () => {
  let component: SedesForm;
  let fixture: ComponentFixture<SedesForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SedesForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SedesForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
