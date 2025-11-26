import { ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/interceptors/api-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { loaderInterceptor } from './core/interceptors/loader-interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAnimations(),
    provideHttpClient(withInterceptors([apiInterceptor, errorInterceptor, loaderInterceptor])),
  ],
};
