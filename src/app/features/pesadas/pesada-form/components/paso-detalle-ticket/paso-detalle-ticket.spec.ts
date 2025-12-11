import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasoDetalleTicket } from './paso-detalle-ticket';

describe('PasoDetalleTicket', () => {
  let component: PasoDetalleTicket;
  let fixture: ComponentFixture<PasoDetalleTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasoDetalleTicket]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasoDetalleTicket);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
