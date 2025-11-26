import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportistaDelete } from './transportista-delete';

describe('TransportistaDelete', () => {
  let component: TransportistaDelete;
  let fixture: ComponentFixture<TransportistaDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportistaDelete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportistaDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
