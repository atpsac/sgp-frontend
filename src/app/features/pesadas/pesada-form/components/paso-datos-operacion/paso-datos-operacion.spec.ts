import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasoDatosOperacion } from './paso-datos-operacion';

describe('PasoDatosOperacion', () => {
  let component: PasoDatosOperacion;
  let fixture: ComponentFixture<PasoDatosOperacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasoDatosOperacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasoDatosOperacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
