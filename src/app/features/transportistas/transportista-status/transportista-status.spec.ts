import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportistaStatus } from './transportista-status';

describe('TransportistaStatus', () => {
  let component: TransportistaStatus;
  let fixture: ComponentFixture<TransportistaStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportistaStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportistaStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
