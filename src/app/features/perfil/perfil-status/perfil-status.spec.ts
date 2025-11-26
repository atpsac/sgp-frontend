import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilStatus } from './perfil-status';

describe('PerfilStatus', () => {
  let component: PerfilStatus;
  let fixture: ComponentFixture<PerfilStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
