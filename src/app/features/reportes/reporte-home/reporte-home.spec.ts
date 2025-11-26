import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteHome } from './reporte-home';

describe('ReporteHome', () => {
  let component: ReporteHome;
  let fixture: ComponentFixture<ReporteHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
