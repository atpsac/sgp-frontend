import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportistaList } from './transportista-list';

describe('TransportistaList', () => {
  let component: TransportistaList;
  let fixture: ComponentFixture<TransportistaList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportistaList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportistaList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
