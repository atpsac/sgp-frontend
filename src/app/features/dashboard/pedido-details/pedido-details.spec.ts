import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidoDetails } from './pedido-details';

describe('PedidoDetails', () => {
  let component: PedidoDetails;
  let fixture: ComponentFixture<PedidoDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidoDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PedidoDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
