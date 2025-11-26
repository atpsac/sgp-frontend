import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleStatus } from './role-status';

describe('RoleStatus', () => {
  let component: RoleStatus;
  let fixture: ComponentFixture<RoleStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
