import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpresaList } from './empresa-list';

describe('EmpresaList', () => {
  let component: EmpresaList;
  let fixture: ComponentFixture<EmpresaList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpresaList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpresaList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
