import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SedesList } from './sedes-list';

describe('SedesList', () => {
  let component: SedesList;
  let fixture: ComponentFixture<SedesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SedesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SedesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
