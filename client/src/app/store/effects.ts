import { switchMap, map, catchError } from 'rxjs/operators';
import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';

import {Observable, of} from 'rxjs';

import { ApiService } from '../services/api.service';

import {Action} from '@ngrx/store';
import * as actions from '../store/actions';
import {EshopActions} from '../store/actions';

@Injectable()
export class AppEffects {

  // AUTH

  @Effect() signIn$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.SignIn),
      switchMap((action: actions.SignIn) => this.apiService.signIn(action.payload)),
      map(res => new actions.SignInSuccess(res))
  );

  @Effect() signUp$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.SignUp),
      switchMap((action: actions.SignUp) => this.apiService.signUp(action.payload)),
      map(res => new actions.SignUpSuccess(res))
  );

  @Effect() fetchUser$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetUser),
      switchMap((action: actions.GetUser) => this.apiService.getUser()),
      map(res => new actions.StoreUser(res)),
      catchError(() => of(new actions.GetUserFail()))
  );

  @Effect() getPages$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetPages),
      switchMap((action: actions.GetUser) => this.apiService.getPages()),
      map(res => new actions.GetPagesSuccess(res)),
      catchError(() => of(new actions.GetPagesFail()))
  );

  @Effect() addOrEditPage$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.AddOrEditPage),
      switchMap((action: actions.AddOrEditPage) => this.apiService.addOrEditPage(action.payload)),
      map(res => new actions.AddOrEditPageSuccess(res)),
      catchError(() => of(new actions.AddOrEditPageFail()))
  );

  @Effect() removePage$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.RemovePage),
      switchMap((action: actions.RemovePage) => this.apiService.removePage(action.payload)),
      map(res => new actions.RemovePageSuccess(res)),
      catchError(() => of(new actions.RemovePageFail()))
  );

  // PRODUCT

  @Effect() getProducts$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetProducts),
      switchMap((action: actions.GetProducts) => this.apiService.getProducts(action.payload)),
      map(res => new actions.GetProductsSuccess(res))
  );

  @Effect() getCategories$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetCategories),
      switchMap((action: actions.GetCategories) => this.apiService.getCategories()),
      map(res => new actions.GetCategoriesSuccess(res))
  );

  @Effect() getProductsSearch$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetProductsSearch),
      switchMap((action: actions.GetProductsSearch) => this.apiService.getProductsSearch(action.payload)),
      map(res => new actions.GetProductsSearchSuccess(res))
  );

  @Effect() getProduct$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetProduct),
      switchMap((action: actions.GetProduct) => this.apiService.getProduct(action.payload)),
      map(res => new actions.GetProductSuccess(res))
  );

  @Effect() MakeOrderWithPayment$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.MakeOrderWithPayment),
      switchMap((action: actions.MakeOrderWithPayment) => this.apiService.handleToken(action.payload)),
      map(res => new actions.MakeOrderWithPaymentSuccess(res))
  );

  @Effect() makeOrder$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.MakeOrder),
      switchMap((action: actions.MakeOrder) => this.apiService.makeOrder(action.payload)),
      map(res => new actions.MakeOrderSuccess(res)),
      catchError(() => of(new actions.MakeOrderFail()))
  );

  @Effect() getCart$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetCart),
      switchMap((action: actions.GetCart) => this.apiService.getCart()),
      map(res => new actions.GetCartSuccess(res))
  );

  @Effect() addToCart$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.AddToCart),
      switchMap((action: actions.AddToCart) => this.apiService.addToCart(action.payload)),
      map(res => new actions.AddToCartSuccess(res))
  );

  @Effect() removeFromCart$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.RemoveFromCart),
      switchMap((action: actions.RemoveFromCart) => this.apiService.removeFromCart(action.payload)),
      map(res => new actions.GetCartSuccess(res))
  );

  @Effect() stripeSession$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.StripeSession),
      switchMap((action: actions.StripeSession) => this.apiService.getStripeSession(action.payload)),
      map(res => new actions.StripeSessionSuccess(res))
  );

  @Effect() GetUserOrders$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetUserOrders),
      switchMap((action: actions.GetUserOrders) => this.apiService.getUserOrders()),
      map(res => new actions.GetUserOrdersSuccess(res))
  );


  // DASHBOARD

  @Effect() addProduct$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.AddProduct),
      switchMap((action: actions.AddProduct) => this.apiService.addProduct(action.payload)),
      map(res => new actions.AddProductSuccess(res))
  );

  @Effect() editProduct$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.EditProduct),
      switchMap((action: actions.EditProduct) => this.apiService.editProduct(action.payload)),
      map(res => new actions.EditProductSuccess(res))
  );

  @Effect() removeProduct$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.RemoveProduct),
      switchMap((action: actions.RemoveProduct) => this.apiService.removeProduct(action.payload)),
      map(res => new actions.RemoveProductSuccess(res))
  );

  @Effect() getAllProducts$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetAllProducts),
      switchMap((action: actions.GetAllProducts) => this.apiService.getAllProducts()),
      map(res => new actions.GetAllProductsSuccess(res))
  );

  @Effect() getImages$: Observable<Action> = this._actions.pipe(
   ofType(EshopActions.GetImages),
      switchMap((action: actions.GetImages) => this.apiService.getImages()),
      map(res => new actions.GetImagesSuccess(res))
  );

  @Effect() addProductImagesUrl$: Observable<Action> = this._actions.pipe(
   ofType(EshopActions.AddProductImagesUrl),
      switchMap((action: actions.AddProductImagesUrl) => this.apiService.addProductImagesUrl(action.payload)),
      map((res : any) => {
        if (res && res.titleUrl) {
          return new actions.GetProductSuccess(res);
        }
        return new actions.AddProductImagesUrlSuccess(res);
      })
  );

  @Effect() removeImage$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.RemoveProductImage),
      switchMap((action: actions.RemoveProductImage) => this.apiService.removeImage(action.payload)),
      map((res: any) => {
        if (res && res.titleUrl) {
          return new actions.GetProductSuccess(res);
        }
        return new actions.RemoveProductImageSuccess(res);
      })
  );

  @Effect({dispatch: false}) setuploder$: Observable<void> = this._actions.pipe(
    ofType(EshopActions.SetUploader),
      switchMap((action: actions.SetUploader) => this.apiService.setUploader(action.payload)),
      map((uploader: any) => console.log('Uploader init'))
  );

  @Effect() getOrders$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetOrders),
      switchMap((action: actions.GetOrders) => this.apiService.getOrders()),
      map(res => new actions.GetOrdersSuccess(res))
  );

  @Effect() getOrder$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetOrder),
      switchMap((action: actions.GetOrder) => this.apiService.getOrder(action.payload)),
      map(res => new actions.GetOrderSuccess(res))
  );

  @Effect() updateOrder$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.UpdateOrder),
      switchMap((action: actions.UpdateOrder) => this.apiService.updateOrder(action.payload)),
      map(res => new actions.GetOrderSuccess(res))
  );

  @Effect() getAllTranslations$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.GetAllTranslations),
      switchMap((action: actions.GetAllTranslations) => this.apiService.getAllTranslations()),
      map(res => new actions.GetAllTranslationsSuccess(res))
  );

  @Effect() editTranslation$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.EditTranslation),
      switchMap((action: actions.EditTranslation) => this.apiService.editAllTranslation(action.payload)),
      map(res => new actions.EditTranslationSuccess(res))
  );

  // OTHERS

  @Effect() sendContact$: Observable<Action> = this._actions.pipe(
    ofType(EshopActions.SendContact),
      switchMap((action: actions.SendContact) => this.apiService.sendContact(action.payload)),
      map(res => new actions.SendContactSuccess())
  );


  constructor(private _actions: Actions, private apiService: ApiService) { }

}
