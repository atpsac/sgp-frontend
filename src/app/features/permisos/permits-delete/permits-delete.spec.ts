import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitsDelete } from './permits-delete';

describe('PermitsDelete', () => {
  let component: PermitsDelete;
  let fixture: ComponentFixture<PermitsDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitsDelete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitsDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
