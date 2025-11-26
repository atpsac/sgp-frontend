import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitsStatus } from './permits-status';

describe('PermitsStatus', () => {
  let component: PermitsStatus;
  let fixture: ComponentFixture<PermitsStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitsStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitsStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
