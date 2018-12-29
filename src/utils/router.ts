import * as deepExtend from 'deep-extend';
import * as XRegex from 'xregexp';
import { Validate, ValidationType } from './validate';
import { Message } from 'discord.js';
import { Bot } from '..';
import * as Utils from '../utils';

const prefix = process.env.BOT_MESSAGE_PREFIX

export interface RouteConfiguration {
  command?: string
  controller: Function | void
  example: string
  help?: string
  middleware?: Array<(routed: RouterRouted) => Promise<RouterRouted | void>>
  name: string
  commandTarget: RouteActionUserTarget
  validate: string
}

export type RouteActionUserTarget = 'none'
  | 'author'
  | 'argument'
  | 'controller-decision'

///
// Route example
//
// {
//   controller: () => { /* do something here */ },
//   example: '!ck ticker set type 2',
//   help: 'ck',
//   name: 'ticker-set-type',
//   validate: '/command:string/subroute:string/action:string/action2:string/type:number'
// }

export class Route {
  public command: string
  public controller: Function
  public example: string
  public help: string
  public middleware: Array<(routed: RouterRouted) => Promise<RouterRouted | void>> = []
  public name: string
  public commandTarget: RouteActionUserTarget = 'none' // Default to none
  public validate: string
  public validation: Validate

  constructor(route: RouteConfiguration) {
    // Merge props from RouteConfiguration passed
    deepExtend(this, route)
    // Set command branch for sorting
    this.command = this.getCommand(route.validate)
    // Setup validation for route
    this.validation = new Validate(route.validate)
  }

  public test(message: string) {
    return this.validation.test(message)
  }

  private getCommand(str: string) {
    const regex = XRegex('^\\/(?<name>[a-z0-9]*)', 'i')
    const match = XRegex.exec(str, regex)
    return match['name']
  }
}

export class Router {
  public bot: Bot
  public routes: Array<Route>

  constructor(routes: Array<RouteConfiguration>, bot?: Bot) {
    this.bot = bot
    this.routes = routes.map(r => new Route(r))
    this.bot.DEBUG(`routes configured = ${this.routes.length}`)
  }

  public async route(message: Message) {
    // // Block my own messages
    // if (msg.author.id === '526039977247899649') return; // Hard block

    const containsPrefix = message.content.startsWith(prefix)

    if (containsPrefix) {
      this.bot.DEBUG_MSG_COMMAND(`Router -> incoming: '${message.content}'`)

      const args = Utils.getArgs(message.content)
      // Find appropriate routes based on prefix command
      const routes = this.routes.filter(r => r.command === args[0])
      this.bot.DEBUG_MSG_COMMAND(`Router -> Routes by '${args[0]}' command: ${routes.length}`)

      // If no routes matched, stop here
      if (routes.length === 0) return;

      // Try to find a route
      const route = await routes.find(r => { return r.test(message.content) === true })
      this.bot.DEBUG_MSG_COMMAND(route)

      // Stop if there's no specific route found
      if (route === undefined) {
        this.bot.DEBUG_MSG_COMMAND(`Router -> Failed to match '${message.content}' to a route - ending routing`)
        // End routing
        return;
      }

      // Process route
      this.bot.DEBUG_MSG_COMMAND('Router -> Route:', route)

      // Normal routed behaviour
      var routed = new RouterRouted({
        bot: this.bot,
        message: message,
        route: route,
        args: args
      })

      const mwareCount = Array.isArray(route.middleware) ? route.middleware.length : 0
      var mwareProcessed = 0

      // Process middleware
      for (const middleware of route.middleware) {
        const fromMiddleware = await middleware(routed)
        // If the returned item is empty stop here
        if (!fromMiddleware) {
          break;
        }
        // When everything is ok, continue
        mwareProcessed += 1
      }

      this.bot.DEBUG_MSG_COMMAND(`Router -> Route middleware processed: ${mwareProcessed}/${mwareCount}`)

      // Stop execution of route if middleware is halted
      if (mwareProcessed === mwareCount) await route.controller(routed)
      return
    }
  }
}

export class RouterRouted {
  public args: Array<string>
  public bot: Bot
  public message: Message
  public route: Route
  public v: {
    valid: boolean;
    validated: ValidationType[];
    o: { [key: string]: any };
  }

  constructor(init: Partial<RouterRouted>) {
    this.bot = init.bot
    this.message = init.message
    this.route = init.route
    this.args = init.args
    // Generate v.*
    this.v = this.route.validation.validateArgs(this.args)
  }
}