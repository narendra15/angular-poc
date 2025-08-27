import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingFilesComponent } from './mapping-files.component';

describe('MappingFilesComponent', () => {
  let component: MappingFilesComponent;
  let fixture: ComponentFixture<MappingFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MappingFilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
