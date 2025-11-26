import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitsList } from './permits-list';

describe('PermitsList', () => {
  let component: PermitsList;
  let fixture: ComponentFixture<PermitsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
