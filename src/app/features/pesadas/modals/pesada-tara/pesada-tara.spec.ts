import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesadaTara } from './pesada-tara';

describe('PesadaTara', () => {
  let component: PesadaTara;
  let fixture: ComponentFixture<PesadaTara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PesadaTara]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PesadaTara);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
