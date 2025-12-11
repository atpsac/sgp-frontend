import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasoTransporte } from './paso-transporte';

describe('PasoTransporte', () => {
  let component: PasoTransporte;
  let fixture: ComponentFixture<PasoTransporte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasoTransporte]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasoTransporte);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
