import { Routes } from '@angular/router';
import { NotFoundPageComponent } from './core/containers/not-found-page';
import { SplashPageComponent } from './core/containers/splash-page/splash-page.component';
import { ModelsResolver, AuthGuard } from 'app/store/resolvers/';

export const routes: Routes = [
	{
		path: '',
		component: SplashPageComponent,
		resolve: {
			models: ModelsResolver,
		},
		// canActivate: [ AuthGuard ]
	},
	{
		path: 'auth',
		loadChildren: './auth/auth.module#AuthModule'
	},
	{
		path: 'search',
		loadChildren: './search/search.module#SearchModule',
		canActivate: [ AuthGuard ]
	},
	{
		path: 'document',
		loadChildren: './document/document.module#DocumentModule',
		canActivate: [ AuthGuard ]
	},
		{ path: '**', component: NotFoundPageComponent },
	];
