import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesadaForm } from './pesada-form';

describe('PesadaForm', () => {
  let component: PesadaForm;
  let fixture: ComponentFixture<PesadaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PesadaForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PesadaForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
