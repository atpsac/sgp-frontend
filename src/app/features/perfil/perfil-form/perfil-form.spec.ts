import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilForm } from './perfil-form';

describe('PerfilForm', () => {
  let component: PerfilForm;
  let fixture: ComponentFixture<PerfilForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
