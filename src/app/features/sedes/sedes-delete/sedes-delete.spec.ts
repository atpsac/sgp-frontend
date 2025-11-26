import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SedesDelete } from './sedes-delete';

describe('SedesDelete', () => {
  let component: SedesDelete;
  let fixture: ComponentFixture<SedesDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SedesDelete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SedesDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
