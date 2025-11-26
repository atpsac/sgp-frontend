import { TestBed } from '@angular/core/testing';

import { Permisos } from './permisos';

describe('Permisos', () => {
  let service: Permisos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Permisos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
