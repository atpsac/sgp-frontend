import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitsForm } from './permits-form';

describe('PermitsForm', () => {
  let component: PermitsForm;
  let fixture: ComponentFixture<PermitsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
