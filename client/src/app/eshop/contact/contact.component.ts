import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Component } from '@angular/core';

import * as actions from './../../store/actions'
import * as fromRoot from '../../store/reducers';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent  {

  contactForm: FormGroup;

  constructor( private _fb: FormBuilder, private store: Store<fromRoot.State>) {

  this.contactForm = this._fb.group({
      name: ['', Validators.required ],
      email: ['', Validators.required ],
      notes: ['', Validators.required ]
    });
   }
   submit() {
    this.store.dispatch(new actions.SendContact(this.contactForm.value));
    this.contactForm.reset();
  }



}
