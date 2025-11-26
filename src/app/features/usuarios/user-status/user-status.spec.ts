import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStatus } from './user-status';

describe('UserStatus', () => {
  let component: UserStatus;
  let fixture: ComponentFixture<UserStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
