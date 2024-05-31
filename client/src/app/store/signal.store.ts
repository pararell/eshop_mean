import { SignalStoreSelectors } from './signal.store.selectors';
import { Injectable } from '@angular/core';
import { ApiService } from '../services/api.service';
import { User } from '../shared/models';



@Injectable({
  providedIn: 'root',
})
export class SignalStore {


  constructor(private apiService: ApiService,
     private selectors: SignalStoreSelectors
  ) {}

signIn = (payload) => {
  this.selectors.userState.update((state) => ({ ...state, loading: true }));
  this.apiService.signIn(payload).subscribe((response: any) => {
    this.selectors.userState.update((state) => ({ ...state, user: response, loading: false }));
  });
};

signUp = (payload) => {
  this.selectors.userState.update((state) => ({ ...state, loading: true }));
  this.apiService.signUp(payload).subscribe(() => {
    this.selectors.userState.update((state) => ({ ...state, loading: false }));
  });
};

getUser = () => {
  this.selectors.userState.update((state) => ({ ...state, loading: true }));
  this.apiService.getUser().subscribe((response: User) => {
    this.selectors.userState.update((state) => ({ ...state, user: response, loading: false }));
  });
};

storeUser = (payload) => {
  this.selectors.userState.update((state) => ({ ...state, user: payload, loading: false }));
};

changeLanguage = (payload) => {
  this.selectors.userState.update((state) => ({ ...state, lang: payload.lang, currency: payload.currency }));
};

sendContact = (payload) => {
  this.selectors.eshopState.update((state) => ({ ...state, loading: true }));
  this.apiService.sendContact(payload).subscribe(() => {
    this.selectors.eshopState.update((state) => ({ ...state, loading: false }));
  });
};

getPages = (payload?) => {
  this.apiService.getPages(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, pages: response }));
  });
};

getPage = (payload) => {
  this.apiService.getPage(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, page: response }));
  });
};

addOrEditPage = (payload) => {
  this.apiService.addOrEditPage(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, page: response }));
  });
};

removePage = (payload) => {
  this.apiService.removePage(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, page: response }));
  });
};

getThemes = () => {
  this.apiService.getThemes().subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, themes: response }));
  });
};

addOrEditTheme = (payload) => {
  this.apiService.addOrEditTheme(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, themes: response }));
  });
};

removeTheme = (payload) => {
  this.apiService.removeTheme(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, themes: response }));
  });
};

getConfigs = () => {
  this.apiService.getConfigs().subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, configs: response }));
  });
};

addOrEditConfig = (payload) => {
  this.apiService.addOrEditConfig(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, configs: response }));
  });
};

removeConfig = (payload) => {
  this.apiService.removeConfig(payload).subscribe((response: any) => {
    this.selectors.eshopState.update((state) => ({ ...state, configs: response }));
  });
};

getProducts = (payload) => {
  this.selectors.productState.update((state) => ({ ...state, loadingProducts: true }));
  this.apiService.getProducts(payload).subscribe((response) => {
    this.selectors.productState.update((state) => ({
      ...state,
      products: response.products,
      pagination: response.pagination,
      maxPrice: response.maxPrice,
      minPrice: response.minPrice,
      loadingProducts: false,
    }));
  });
};

getCategories = (payload) => {
  this.apiService.getCategories(payload).subscribe((response: any) => {
    this.selectors.productState.update((state) => ({ ...state, categories: response }));
  });
};

getProduct = (payload) => {
  this.selectors.productState.update((state) => ({ ...state, loadingProduct: true }));
  this.apiService.getProduct(payload).subscribe((response: any) => {
    this.selectors.productState.update((state) => ({ ...state, product: response, loadingProduct: false }));
  });
};

getProductSearch = (payload) => {
  this.apiService.getProductsSearch(payload).subscribe((response: any) => {
    this.selectors.productState.update((state) => ({ ...state, productsTitles: response }));
  });
};

getCart = (payload) => {
  this.apiService.getCart(payload).subscribe((response: any) => {
    this.selectors.productState.update((state) => ({ ...state, cart: response }));
  });
};

addToCart = (payload) => {
  this.apiService.addToCart(payload).subscribe((response: any) => {
    this.selectors.productState.update((state) => ({ ...state, cart: response }));
  });
};

removeFromCart = (payload) => {
  this.apiService.removeFromCart(payload).subscribe((response: any) => {
    this.selectors.productState.update((state) => ({ ...state, cart: response }));
  });
};

makeOrder = (payload) => {
  this.selectors.productState.update((state) => ({ ...state, loading: true }));
  this.apiService.makeOrder(payload).subscribe((response: any) => {
    if (response.error || !response) {
      this.selectors.productState.update((state) => ({
        ...state,
        order: null,
        error: 'ORDER_SUBMIT_ERROR',
        loading: false,
      }));
    }
    this.selectors.productState.update((state) => ({
      ...state,
      order: response.result,
      cart: response.cart,
      error: response.error,
      loading: false,
    }));
  });
};

makeOrderWithPayment = (payload) => {
  this.selectors.productState.update((state) => ({ ...state, loading: true }));
  this.apiService.handleToken(payload).subscribe((response: any) => {
    if (response.error || !response) {
      this.selectors.productState.update((state) => ({
        ...state,
        order: null,
        error: 'ORDER_SUBMIT_ERROR',
        loading: false,
      }));
    }
    this.selectors.productState.update((state) => ({
      ...state,
      order: response.result,
      cart: response.cart,
      error: response.error,
      loading: false,
    }));
  });
};

getStripeSession = (payload) => {
  this.apiService.getStripeSession(payload);
};

getUserOrders = () => {
  this.apiService.getUserOrders().subscribe((response: any) => {
    this.selectors.productState.update((state) => ({ ...state, userOrders: response }));
  });
}

filterPrice = (payload) => {
  this.selectors.productState.update((state) => ({ ...state, priceFilter: payload }));
};

updatePosition = (payload) => {
  this.selectors.productState.update((state) => ({ ...state, position: payload }));
};

cleanError = () => {
  this.selectors.productState.update((state) => ({ ...state, order: null, error: '' }));
};

getOrders = () => {
  this.apiService.getOrders().subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, orders: response }));
  });
}

getOrder = (payload) => {
  this.apiService.getOrder(payload).subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, order: response }));
    this.selectors.productState.update((state) => ({ ...state, order: response }));
  });
}

addProduct = (payload) => {
  this.apiService.addProduct(payload).subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, allProducts: response }));
  });
}

editProduct = (payload) => {
  this.selectors.dashboardState.update((state) => ({ ...state, loading: true }));
  this.apiService.editProduct(payload).subscribe(() => {
    this.selectors.dashboardState.update((state) => ({ ...state, loading: false }));
  });
}

removeProduct = (payload) => {
  this.selectors.dashboardState.update((state) => ({ ...state, loading: true }));
  this.apiService.removeProduct(payload).subscribe(() => {
    this.selectors.dashboardState.update((state) => ({ ...state, loading: false }));
  });
}

storeProduct = (payload) => {
  this.selectors.productState.update((state) => ({ ...state, product: payload, loadingProduct: false}));
}

getAllProducts = () => {
  this.apiService.getAllProducts().subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, allProducts: response }));
  });
}

getAllCategories = () => {
  this.apiService.getAllCategories().subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, allCategories: response }));
  });
}

editCategory = (payload) => {
  this.apiService.editCategory(payload);
}

removeCategory = (payload) => {
  this.apiService.removeCategory(payload);
}

getImages = () => {
  this.apiService.getImages().subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, productImages: response.all }));
  });
}

addProductImagesUrl = (payload) => {
  this.apiService.addProductImagesUrl(payload).subscribe((response: any) => {
    if (response && response.titleUrl) {
      this.selectors.productState.update((state) => ({ ...state, product: response }));
    }
    this.selectors.dashboardState.update((state) => ({ ...state, productImages: response.all }));
  });
}

removeImage = (payload) => {
  this.apiService.removeImage(payload).subscribe((response: any) => {
    if (response && response.titleUrl) {
      this.selectors.productState.update((state) => ({ ...state, product: response }));
    }
    this.selectors.dashboardState.update((state) => ({ ...state, productImages: response.all }));
  });
}

storeProductImages = (payload) => {
  this.selectors.dashboardState.update((state) => ({ ...state, productImages: payload.all }));
}

updateOrder = (payload) => {
  this.apiService.updateOrder(payload).subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, order: response }));
  });
}

getAllTranslations = () => {
  this.apiService.getAllTranslations().subscribe((response: any) => {
    this.selectors.dashboardState.update((state) => ({ ...state, translations: response }));
  });
}

editTranslation = (payload) => {
  this.selectors.dashboardState.update((state) => ({ ...state, loading: true }));
  this.apiService.editAllTranslation(payload).subscribe((response: any) => {
    this.selectors.dashboardState.update(state => ({
      ...state,
      loading: false,
      translations: state.translations.map(trans => trans._id === response._id ? response : trans)
    }))
  })
};

}
