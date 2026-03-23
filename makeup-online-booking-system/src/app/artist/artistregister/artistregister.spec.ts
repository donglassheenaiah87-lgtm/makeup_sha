import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Artistregister } from './artistregister';

describe('Artistregister', () => {
  let component: Artistregister;
  let fixture: ComponentFixture<Artistregister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Artistregister],
    }).compileComponents();

    fixture = TestBed.createComponent(Artistregister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
