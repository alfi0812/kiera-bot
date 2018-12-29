import { RouteConfiguration } from '../utils/router';
import * as Commands from '../controllers/commands';
import * as Middleware from '../middleware';

export const Routes: Array<RouteConfiguration> = [
  {
    commandTarget: 'none',
    controller: Commands.versionCheck,
    example: '!version',
    name: 'admin-version',
    validate: '/version:string',
    middleware: [
      Middleware.hasRole(['tester', 'developer'])
    ]
  },
  {
    commandTarget: 'none',
    controller: Commands.pingPong,
    example: '!ping',
    name: 'admin-ping',
    validate: '/ping:string',
    middleware: [
      Middleware.hasRole(['tester', 'developer'])
    ]
  },
  {
    commandTarget: 'argument',
    controller: Commands.adminRemoveUser,
    example: '!admin user delete @user#0000',
    name: 'admin-user-delete',
    validate: '/admin:string/user:string/delete:string/user=user',
    middleware: [
      Middleware.hasRole('developer')
    ]
  },
]