import { Routes } from "@angular/router";
import { ContactComponent } from "./contact/contact.component";
import { PageComponent } from "./page/page.component";


export const ESHOP_ROUTER: Routes = [
  {
    path: 'contact',
    component: ContactComponent
  },
  {
    path: ':titleUrl',
    component: PageComponent
  }
]
