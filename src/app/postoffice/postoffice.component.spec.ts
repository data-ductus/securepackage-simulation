import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PostofficeComponent } from './postoffice.component';

describe('PostofficeComponent', () => {
  let component: PostofficeComponent;
  let fixture: ComponentFixture<PostofficeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PostofficeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PostofficeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
