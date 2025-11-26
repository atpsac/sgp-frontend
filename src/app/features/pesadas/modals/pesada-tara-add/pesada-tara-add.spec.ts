import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesadaTaraAdd } from './pesada-tara-add';

describe('PesadaTaraAdd', () => {
  let component: PesadaTaraAdd;
  let fixture: ComponentFixture<PesadaTaraAdd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PesadaTaraAdd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PesadaTaraAdd);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
