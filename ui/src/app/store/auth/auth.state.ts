import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { DefaultService } from 'app/service/api/default.service';
import * as actions from './auth.actions';
import * as notification from 'app/store/notification/notification.actions';
import { tap } from 'rxjs/operators';
import * as _ from 'underscore';

import { LoginDialog } from 'app/auth/components/login-dialog/login-dialog.component';
import { WorkflowState } from 'app/store/workflow/workflow.state';
import { ModelState } from 'app/store/model/model.state';


export * from './auth.actions';


//TODO type User later

export interface AuthStateModel {
	loggedIn: boolean;
	user: any;
	privileges: string[];
}

@State<AuthStateModel>({
		name: 'auth',
		defaults: {
			loggedIn: false,
			user: null,
			privileges: []
		},
})
export class AuthState {

		@Selector() static loggedIn(state: AuthStateModel): boolean { return state.loggedIn; }
		@Selector() static user(state: AuthStateModel): any { return state.user; }
		@Selector() static userPrivileges(state: AuthStateModel): any { return state.privileges; }

		constructor(
			private store: Store,
			private service: DefaultService,
			private dialog: MatDialog,
			private router: Router) {}

		@Action(actions.GetUser)
			getUser({ dispatch }: StateContext<AuthStateModel>, action: actions.GetUser) {
				return this.service.getMe()
					.pipe(
						tap((user: any) => {
							return user.uid ? dispatch(new actions.LoginSuccess(user)) : dispatch(new actions.OpenLoginDialog());
						}),
					);
		}

		@Action(actions.GetUserPrivileges)
			getUserPrivileges({ patchState, getState }: StateContext<AuthStateModel>, action: actions.GetUserPrivileges) {
				let privileges: string[] = [];
				const userroles = getState().user.roles;
				const modelname = this.store.selectSnapshot(ModelState.currentModel).name;
				const nodeprivileges = this.store.selectSnapshot(WorkflowState.currentNodePrivileges);
				const currentUserRoles = _.pluck(userroles.filter((role: any) => role.model === modelname), 'role');
				_.each(currentUserRoles, function(role) {
					privileges = _.union(privileges, _.findWhere(nodeprivileges, {'role': role}).privilege);
				});
				patchState({privileges: privileges});
		}

		@Action(actions.LoginSuccess)
			loginSuccess({ patchState,  dispatch }: StateContext<AuthStateModel>, { payload }: actions.LoginSuccess) {
				patchState({ user: payload, loggedIn: true });
				this.router.navigateByUrl(localStorage.getItem('returnUrl') || '/');
				return dispatch(new notification.SuccessNotificationOpen('You have successfully logged in'));
		}

		@Action(actions.Logout)
			logout({ patchState }: StateContext<AuthStateModel>, { }: actions.Logout) {
				patchState({ user: null, loggedIn: false });
				this.router.navigate(['/']);
		}

		@Action(actions.OpenLoginDialog)
			openLoginDialog() {
				this.dialog.open(LoginDialog, {
					width: '400px',
					position: { top: '200px' },
					disableClose: true
				});
		}

}
