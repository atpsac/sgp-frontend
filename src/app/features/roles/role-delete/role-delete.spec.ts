import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleDelete } from './role-delete';

describe('RoleDelete', () => {
  let component: RoleDelete;
  let fixture: ComponentFixture<RoleDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleDelete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
