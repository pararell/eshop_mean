import { switchMap, map, filter } from 'rxjs/operators';
import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';

import {Observable} from 'rxjs';

import { ApiService } from '../services/api.service';

import {Action} from '@ngrx/store';
import * as actions from '../store/actions';


@Injectable()
export class AppEffects {

  @Effect() fetchUser$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_USER_ACTION),
      switchMap((action: actions.LoadUserAction) => this.apiService.getUser()),
      map(res => new actions.StoreUserAction(res))
  );

  @Effect() loadPayment$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_PAYMENT),
      switchMap((action: actions.LoadPayment) => this.apiService.handleToken(action.payload)),
      map(res => new actions.LoadPaymentSuccess(res))
  );

  @Effect() makeOrder$: Observable<Action> = this._actions.pipe(
    ofType(actions.MAKE_ORDER),
      switchMap((action: actions.MakeOrder) => this.apiService.makeOrder(action.payload)),
      map(res => new actions.MakeOrderSuccess(res))
  );

  @Effect() loadProducts$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_PRODUCTS),
      switchMap((action: actions.LoadProducts) => this.apiService.loadProducts(action.payload)),
      map(res => new actions.LoadProductsSuccess(res))
  );

  @Effect() loadCategories$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_CATEGORIES),
      switchMap((action: actions.LoadCategories) => this.apiService.loadCategories(action.payload)),
      map(res => new actions.LoadCategoriesSuccess(res))
  );

  @Effect() loadProductsSearch$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_PRODUCTS_SEARCH),
      switchMap((action: actions.LoadProductsSearch) => this.apiService.loadProductsSearch(action.payload)),
      map(res => new actions.LoadProductsSearchSuccess(res))
  );


  @Effect() addProduct$: Observable<Action> = this._actions.pipe(
    ofType(actions.ADD_PRODUCT),
      switchMap((action: actions.AddProduct) => this.apiService.addProduct(action.payload)),
      map(res => new actions.AddProductSuccess(res))
  );

  @Effect() editProduct$: Observable<Action> = this._actions.pipe(
    ofType(actions.EDIT_PRODUCT),
      switchMap((action: actions.EditProduct) => this.apiService.editProduct(action.payload)),
      map(res => new actions.EditProductSuccess(res))
  );

  @Effect() removeProduct$: Observable<Action> = this._actions.pipe(
    ofType(actions.REMOVE_PRODUCT),
      switchMap((action: actions.RemoveProduct) => this.apiService.removeProduct(action.payload)),
      map(res => new actions.RemoveProductSuccess(res))
  );

  @Effect() getProduct$: Observable<Action> = this._actions.pipe(
    ofType(actions.GET_PRODUCT),
      switchMap((action: actions.GetProduct) => this.apiService.getProduct(action.payload)),
      map(res => new actions.GetProductSuccess(res))
  );

  @Effect() getCart$: Observable<Action> = this._actions.pipe(
    ofType(actions.GET_CART),
      switchMap((action: actions.GetCart) => this.apiService.getCart()),
      map(res => new actions.GetCartSuccess(res))
  );

  @Effect() addToCart$: Observable<Action> = this._actions.pipe(
    ofType(actions.ADD_TO_CART),
      switchMap((action: actions.AddToCart) => this.apiService.addToCart(action.payload)),
      map(res => new actions.AddToCartSuccess(res))
  );

  @Effect() removeFromCart$: Observable<Action> = this._actions.pipe(
    ofType(actions.REMOVE_FROM_CART),
      switchMap((action: actions.RemoveFromCart) => this.apiService.removeFromCart(action.payload)),
      map(res => new actions.GetCartSuccess(res))
  );

  @Effect() getImages$: Observable<Action> = this._actions.pipe(
   ofType(actions.GET_IMAGES),
      switchMap((action: actions.GetImages) => this.apiService.getImages()),
      map(res => new actions.GetImagesSuccess(res))
  );


  @Effect() addProductImagesUrl$: Observable<Action> = this._actions.pipe(
   ofType(actions.ADD_PRODUCT_IMAGES_URL),
      switchMap((action: actions.AddProductImagesUrl) => this.apiService.addProductImagesUrl(action.payload)),
      map((res : any) => {
        if (res && res.titleUrl) {
          return new actions.GetProductSuccess(res);
        }
        return new actions.AddProductImagesUrlSuccess(res);
      })
  );

  @Effect() removeImage$: Observable<Action> = this._actions.pipe(
    ofType(actions.REMOVE_PRODUCT_IMAGE),
      switchMap((action: actions.RemoveProductImage) => this.apiService.removeImage(action.payload)),
      map((res: any) => {
        if (res && res.titleUrl) {
          return new actions.GetProductSuccess(res);
        }
        return new actions.RemoveProductImageSuccess(res);
      })
  );


  @Effect({dispatch: false}) setuploder$: Observable<void> = this._actions.pipe(
    ofType(actions.SET_UPLOADER),
      switchMap((action: actions.SetUploader) => this.apiService.setUploader(action.payload)),
      map((uploader: any) => console.log('Uploader init'))
  );

  @Effect() stripeSession$: Observable<Action> = this._actions.pipe(
    ofType(actions.STRIPE_SESSION),
      switchMap((action: actions.StripeSession) => this.apiService.getStripeSession(action.payload)),
      map(res => new actions.StripeSessionSuccess(res))
  );


  @Effect() loadOrders$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_ORDERS),
      switchMap((action: actions.LoadOrders) => this.apiService.getOrders()),
      map(res => new actions.LoadOrdersSuccess(res))
  );

  @Effect() loadOrder$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_ORDER),
      switchMap((action: actions.LoadOrder) => this.apiService.getOrder(action.payload)),
      map(res => new actions.LoadOrderSuccess(res))
  );

  @Effect() loadUserOrders$: Observable<Action> = this._actions.pipe(
    ofType(actions.LOAD_USER_ORDERS),
      switchMap((action: actions.LoadUserOrders) => this.apiService.getUserOrders(action.payload)),
      map(res => new actions.LoadUserOrdersSuccess(res))
  );

  @Effect() updateOrder$: Observable<Action> = this._actions.pipe(
    ofType(actions.UPDATE_ORDER),
      switchMap((action: actions.UpdateOrder) => this.apiService.updateOrder(action.payload)),
      map(res => new actions.LoadOrderSuccess(res))
  );

  @Effect() getAllTranslations$: Observable<Action> = this._actions.pipe(
    ofType(actions.GET_ALL_TRANSLATIONS),
      switchMap((action: actions.GetAllTranslations) => this.apiService.getAllTranslations()),
      map(res => new actions.GetAllTranslationsSuccess(res))
  );

  @Effect() editTranslation$: Observable<Action> = this._actions.pipe(
    ofType(actions.EDIT_TRANSLATION),
      switchMap((action: actions.EditTranslation) => this.apiService.editTranslation(action.payload)),
      map(res => new actions.EditTranslationSuccess(res))
  );

  @Effect() sendContact$: Observable<Action> = this._actions.pipe(
    ofType(actions.SEND_CONTACT),
      switchMap((action: actions.SendContact) => this.apiService.sendContact(action.payload)),
      map(res => new actions.SendContactSuccess(res))
  );


  @Effect() signIn$: Observable<Action> = this._actions.pipe(
    ofType(actions.SIGN_IN),
      switchMap((action: actions.SignIn) => this.apiService.signIn(action.payload)),
      map(res => new actions.SignInSuccess(res))
  );


  @Effect() signUp$: Observable<Action> = this._actions.pipe(
    ofType(actions.SIGN_UP),
      switchMap((action: actions.SignUp) => this.apiService.signUp(action.payload)),
      map(res => new actions.SignUpSuccess(res))
  );

  constructor(private _actions: Actions, private apiService: ApiService) { }

}
