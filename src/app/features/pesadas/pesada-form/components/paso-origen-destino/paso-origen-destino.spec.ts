import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasoOrigenDestino } from './paso-origen-destino';

describe('PasoOrigenDestino', () => {
  let component: PasoOrigenDestino;
  let fixture: ComponentFixture<PasoOrigenDestino>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasoOrigenDestino]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasoOrigenDestino);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
