import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewPdf } from './preview-pdf';

describe('PreviewPdf', () => {
  let component: PreviewPdf;
  let fixture: ComponentFixture<PreviewPdf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewPdf]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreviewPdf);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
