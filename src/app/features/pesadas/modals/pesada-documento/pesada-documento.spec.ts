import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesadaDocumento } from './pesada-documento';

describe('PesadaDocumento', () => {
  let component: PesadaDocumento;
  let fixture: ComponentFixture<PesadaDocumento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PesadaDocumento]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PesadaDocumento);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
