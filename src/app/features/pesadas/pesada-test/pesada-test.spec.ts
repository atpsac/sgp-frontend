import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesadaTest } from './pesada-test';

describe('PesadaTest', () => {
  let component: PesadaTest;
  let fixture: ComponentFixture<PesadaTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PesadaTest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PesadaTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
