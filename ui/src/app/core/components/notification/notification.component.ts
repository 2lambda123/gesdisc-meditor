import { Component } from '@angular/core'
import { MatSnackBar, MatSnackBarConfig } from '@angular/material'
import { SnackBarComponent } from 'app/store/effects/notification.effects'
import { Observable } from 'rxjs/Observable'
import { Store, Select } from '@ngxs/store'
import { NotificationClose, NotificationState } from 'app/store/notification/notification.state'

const SNACKBAR_VERTICAL_POSITION = 'top'
const SNACKBAR_CLOSE_AFTER_MILLIS = 3000

@Component({
  selector: 'med-notification',
  template: ''
})
export class NotificationComponent {

    @Select(NotificationState) notification$: Observable<any>

    snackBar: any
    closeDelay: any

    constructor(private store: Store, private matSnackBar: MatSnackBar) {}

    ngOnInit() {
        this.notification$.subscribe((notification: any) => {
            if (!notification.show) {
                this.closeNotification()
                return
            } 
            
            this.showNotification(notification)
        })
    }

    private showNotification(notification: any) {
        let snackBarConfig: MatSnackBarConfig = {
            data: notification.message,
            verticalPosition: SNACKBAR_VERTICAL_POSITION,
            panelClass: notification.action ? `${notification.action}-notification` : '',
        }

        this.snackBar = this.matSnackBar.openFromComponent(SnackBarComponent, snackBarConfig)
        this.snackBar.instance.snackBarRefComponent = this.snackBar

        this.closeNotificationAfterDelay()
    }

    private closeNotificationAfterDelay() {
        this.closeDelay = setTimeout(() => {
            this.store.dispatch(new NotificationClose())
        }, SNACKBAR_CLOSE_AFTER_MILLIS)
    }

    private closeNotification() {
        this.matSnackBar.dismiss()
    }

}
