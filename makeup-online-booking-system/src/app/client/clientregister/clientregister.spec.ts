import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Clientregister } from './clientregister';

describe('Clientregister', () => {
  let component: Clientregister;
  let fixture: ComponentFixture<Clientregister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clientregister],
    }).compileComponents();

    fixture = TestBed.createComponent(Clientregister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
