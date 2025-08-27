import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SysHealthComponent } from './sys-health.component';

describe('SysHealthComponent', () => {
  let component: SysHealthComponent;
  let fixture: ComponentFixture<SysHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SysHealthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SysHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
