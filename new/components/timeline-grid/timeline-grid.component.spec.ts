import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineGridComponent } from './timeline-grid.component';

describe('TimelineGridComponent', () => {
  let component: TimelineGridComponent;
  let fixture: ComponentFixture<TimelineGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimelineGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
