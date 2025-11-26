import { TestBed } from '@angular/core/testing';

import { Transportista } from './transportista';

describe('Transportista', () => {
  let service: Transportista;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Transportista);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
