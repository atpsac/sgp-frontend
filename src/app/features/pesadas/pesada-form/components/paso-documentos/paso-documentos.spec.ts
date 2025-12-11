import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasoDocumentos } from './paso-documentos';

describe('PasoDocumentos', () => {
  let component: PasoDocumentos;
  let fixture: ComponentFixture<PasoDocumentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasoDocumentos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasoDocumentos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
