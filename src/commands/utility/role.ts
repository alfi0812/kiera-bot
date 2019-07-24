import * as Middleware from '../../middleware';
import * as Utils from '../../utils';
import { RouterRouted } from '../../utils';
import { TrackedBotSetting } from '../../objects/setting';
import { ChastiKeyAPIFetchAndStore } from '../../tasks/templates/ck-api-fetch-store';
import { ExportRoutes } from '../../router/routes-exporter';

export const Routes = ExportRoutes(
  {
    type: 'message',
    category: 'Utility',
    commandTarget: 'argument',
    controller: displayRoles,
    example: '{{prefix}}util show roles',
    name: 'util-roles-stats',
    validate: '/util:string/show:string/roles:string'
  },
  {
    type: 'message',
    category: 'Utility',
    commandTarget: 'argument',
    controller: displayRoleRange,
    example: '{{prefix}}util show role 0 to 10',
    name: 'util-role-stats',
    validate: '/util:string/show:string/role:string/from=number/to:string/until=number'
  }
)

/**
 * Show roles and counts
 * @export
 * @param {RouterRouted} routed
 */
export async function displayRoles(routed: RouterRouted) {
  var longestName = 0
  var largestNumber = 0

  var roles = routed.message.guild.roles.array().map(r => {
    // Track current longest name & largest member count number
    if (longestName < r.name.length) longestName = r.name.length
    if (largestNumber < String(r.members || 0).length) largestNumber = String(r.members || 0).length

    return { name: r.name, hexColor: r.hexColor, members: r.members.size, position: r.position }
  })

  // Sort roles by position
  roles.sort((a, b) => {
    var x = a.position;
    var y = b.position;
    if (x > y) { return -1; }
    if (x < y) { return 1; }
    return 0;
  })

  var message = `\n**Server Roles**\n`

  message += `\`\`\``

  roles.forEach(r => {
    message += `[${r.position < 10 ? `0` + r.position : r.position}] ${r.name} ${Array.from(Array((longestName + 3) - r.name.length)).join('.')} ${r.members} ${Array.from(Array((largestNumber) - String(r.members || 0).length)).join('.')} Hex Color ${r.hexColor}\n`
  })

  message += `\`\`\``

  routed.message.channel.send(message)

  // Successful end
  return true
}


/**
 * Show specific role
 * @export
 * @param {RouterRouted} routed
 */
export async function displayRoleRange(routed: RouterRouted) {
  const roles = routed.message.guild.roles.array().map(r => { return { name: r.name, hexColor: r.hexColor, members: r.members.size, position: r.position } })

  // Sort roles by position
  roles.sort((a, b) => {
    var x = a.position;
    var y = b.position;
    if (x < y) { return -1; }
    if (x > y) { return 1; }
    return 0;
  })

  // Splice out only what the user wants
  const slicedRoles = roles.slice(routed.v.o.from, routed.v.o.until)


  if (slicedRoles.length > 0) {
    var message = `\n**Server Role(s)**\n`

    message += `\`\`\``

    slicedRoles.forEach((r, i) => {
      message += `Name:        ${r.name}\n`
      message += `Member Count ${r.members}\n`
      message += `Hex color    ${r.hexColor}\n`
      if (i < (slicedRoles.length - 1)) message += `\n` // Add extra space between roles

    })

    message += `\`\`\``

    routed.message.channel.send(message)
  }
  else routed.message.channel.send('Count not find roles in the given range!')
  // Successful end
  return true
}