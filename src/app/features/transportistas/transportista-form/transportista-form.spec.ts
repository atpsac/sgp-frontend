import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportistaForm } from './transportista-form';

describe('TransportistaForm', () => {
  let component: TransportistaForm;
  let fixture: ComponentFixture<TransportistaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportistaForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportistaForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
