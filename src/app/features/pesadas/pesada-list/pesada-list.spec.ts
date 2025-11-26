import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesadaList } from './pesada-list';

describe('PesadaList', () => {
  let component: PesadaList;
  let fixture: ComponentFixture<PesadaList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PesadaList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PesadaList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
