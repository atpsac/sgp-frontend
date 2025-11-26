import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesadaPeso } from './pesada-peso';

describe('PesadaPeso', () => {
  let component: PesadaPeso;
  let fixture: ComponentFixture<PesadaPeso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PesadaPeso]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PesadaPeso);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
