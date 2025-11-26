import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SedesStatus } from './sedes-status';

describe('SedesStatus', () => {
  let component: SedesStatus;
  let fixture: ComponentFixture<SedesStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SedesStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SedesStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
