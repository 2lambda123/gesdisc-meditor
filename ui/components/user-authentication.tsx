import LoginDialog from '../components/login-dialog'
import { useEffect } from 'react'
import mEditorAPI from '../service/'
import { attachInterceptor } from '../service/'
import Router from 'next/router'

class User {
    roles: []

    constructor(props) {
        Object.assign(this, props)
    }

    rolesForModel(modelName) {
        return this.roles
            .filter((role: any) => role.model === modelName) // only get roles for the requested model name
            .map((role: any) => role.role) // retrieve the role name
            .filter((v, i, a) => a.indexOf(v) === i) // remove duplicates
    }
}

/**
 * handles app-wide user authentication, logging in the user and updating the state when the user
 * changes
 */
const UserAuthentication = ({ onUserUpdate = (_user: any) => {}, user, isAuthenticated }) => {
    async function fetchUser() {
        try {
            handleLoggedInUser(await mEditorAPI.getMe())
        } catch (err) {
            handleLoggedOutUser()
        }
    }

    async function handleLoggedInUser(user) {
        onUserUpdate(new User(user))
    }

    async function handleLoggedOutUser() {
        onUserUpdate(null)

        // unauthenticated users can only view the dashboard, send them there
        if (Router.pathname != '/') {
            localStorage.setItem(
                'redirectUrl',
                JSON.stringify({
                    href: Router.pathname,
                    as: Router.asPath,
                })
            )

            Router.push('/')
        }
    }

    useEffect(() => {
        attachInterceptor({
            response: function(response) {
                if (response.status === 401) {
                    handleLoggedOutUser()
                }

                return response
            },
        })

        fetchUser()
    }, [])

    return (
        <>
            <LoginDialog show={typeof user !== 'undefined' && isAuthenticated === false} />
        </>
    )
}

export default UserAuthentication
