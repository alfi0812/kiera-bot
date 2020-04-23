import * as Middleware from '@/middleware'
import * as XRegex from 'xregexp'
import * as Utils from '@/utils'
import { ExportRoutes, RouterRouted } from '@/router'
import { TrackedMutedUser, TrackedUser } from '@/objects/user'

export const Routes = ExportRoutes(
  {
    type: 'message',
    category: 'Moderate',
    commandTarget: 'none',
    controller: mute,
    example: '{{prefix}}mod mute emma#1366',
    name: 'mod-mute-user',
    validate: '/mod:string/mute:string/user=string/reason?=string',
    middleware: [Middleware.isModerator],
    permissions: {
      serverOnly: true
    }
  },
  {
    type: 'message',
    category: 'Moderate',
    commandTarget: 'none',
    controller: unMute,
    example: '{{prefix}}mod unmute emma#1366',
    name: 'mod-unmute-user',
    validate: '/mod:string/unmute:string/user=string',
    middleware: [Middleware.isModerator],
    permissions: {
      serverOnly: true
    }
  },
  {
    type: 'message',
    category: 'Moderate',
    commandTarget: 'none',
    controller: activeMutes,
    example: '{{prefix}}mod list muted',
    name: 'mod-muted-list',
    validate: '/mod:string/list:string/muted:string',
    middleware: [Middleware.isModerator],
    permissions: {
      serverOnly: true
    }
  },
  {
    type: 'message',
    category: 'Moderate',
    commandTarget: 'none',
    controller: lookupMutes,
    example: '{{prefix}}mod lookup mute emma#1366',
    name: 'mod-mute-lookup-list',
    validate: '/mod:string/lookup:string/mute:string/user=string',
    middleware: [Middleware.isModerator],
    permissions: {
      serverOnly: true
    }
  }
)

export async function mute(routed: RouterRouted) {
  const muteRole = routed.message.guild.roles.cache.find((r) => r.name === 'Temporary Mute')
  const regex = XRegex('^((?<username>(?!@|#|:|`).*)\\#(?<discriminator>[0-9]{4,5}))$', 'i')
  const match = XRegex.exec(routed.v.o.user, regex)
  const username = match['username']
  const discriminator = match['discriminator']
  const kieraInGuild = routed.message.guild.members.cache.find((u) => u.id === routed.bot.client.user.id)

  // Error in username passed
  if (!username || !discriminator) {
    await routed.message.reply('This command requires a Username & Discriminator, like this (__But with no @__) `emma#1366`')
    return true
  }

  const targetUser = routed.message.guild.members.cache.find((m) => m.user.username.toLocaleLowerCase() === username.toLocaleLowerCase() && m.user.discriminator === discriminator)

  // Could not find user
  if (!targetUser) {
    await routed.message.reply(`Could not find the requested user, make sure you're searching based off their username and not nickname.`)
    return true
  }

  // Block trying to call upon yourself
  if (targetUser.id === routed.user.id) {
    await routed.message.reply('Cannot call the command upon yourself!')
    return true
  }

  // See if one is already active and stored for this user
  const hasActiveMuteAlready = await routed.bot.DB.verify<TrackedMutedUser>('muted-users', { id: targetUser.id, active: true })

  // If they already have one active, let the caller of this command know
  if (hasActiveMuteAlready) {
    await routed.message.reply('This user already has an active mute being tracked!')
    return true
  }

  // Does user have a role above Kiera?
  const rolesAboveKiera = targetUser.roles.cache.array().filter((r) => {
    return r.position >= kieraInGuild.roles.highest.position
  })
  const hasRolesAboveKiera = rolesAboveKiera.length >= 0

  if (hasRolesAboveKiera) {
    // Let user calling this command know that there's roles that cannot be removed due to those roles
    // holding the same or higher position than Kiera
    await routed.message.reply(`Failed to make mute changes`)
  }

  // Now assign the user the mute role removing all previous as well
  // Remove the conflicting roles from the collection being updated
  var rolesToRemove = hasRolesAboveKiera ? targetUser.roles.cache.filter((r) => rolesAboveKiera.findIndex((rr) => rr.id === r.id) === -1).array() : targetUser.roles.cache.array()
  // Remove @everyone
  rolesToRemove.splice(
    rolesToRemove.findIndex((rr) => rr.name === '@everyone' || rr.name === 'Nitro Booster'),
    1
  )

  try {
    await targetUser.roles.remove(rolesToRemove.map((r) => r.id))
    await targetUser.roles.add(muteRole)
  } catch (error) {
    console.log(`Failed to make mute changes`, error)
    await routed.message.reply(`Failed to make mute changes`)
  }

  const mutedUserRecord = new TrackedMutedUser({
    id: targetUser.id,
    username: targetUser.user.username,
    discriminator: targetUser.user.discriminator,
    nickname: targetUser.nickname,
    serverID: routed.message.guild.id,
    reason: routed.v.o.reason || '<blank>',
    mutedById: routed.user.id,
    mutedByUsername: routed.user.username,
    mutedByDiscriminator: routed.user.discriminator,
    roles: rolesToRemove.map((r) => {
      return { id: r.id, name: r.name }
    })
  })

  // Store a record of the muted user's info into Kiera's DB for later if/when unmuted to return roles
  await routed.bot.DB.add('muted-users', mutedUserRecord)

  await routed.message.channel.send(
    `:mute: **Muted User**\nUser = \`${routed.v.o.user}\`\nReason = \`${mutedUserRecord.reason}\`\nRoles Preserved = \`${mutedUserRecord.roles.map((r) => r.name).join(' ')}\``
  )
  return true
}

export async function unMute(routed: RouterRouted) {
  const muteRole = routed.message.guild.roles.cache.find((r) => r.name === 'Temporary Mute')
  const regex = XRegex('^((?<username>(?!@|#|:|`).*)\\#(?<discriminator>[0-9]{4,5}))$', 'i')
  const match = XRegex.exec(routed.v.o.user, regex)
  const username = match['username']
  const discriminator = match['discriminator']

  // Error in username passed
  if (!username || !discriminator) {
    await routed.message.reply('This command requires a Username & Discriminator, like this (__But with no @__) `emma#1366`')
    return true
  }

  const targetUser = routed.message.guild.members.cache.find((m) => m.user.username.toLocaleLowerCase() === username.toLocaleLowerCase() && m.user.discriminator === discriminator)

  // Could not find user
  if (!targetUser) {
    await routed.message.reply(`Could not find the requested user, make sure you're searching based off their username and not nickname.`)
    return true
  }

  // Block trying to call upon yourself
  if (targetUser.id === routed.user.id) {
    await routed.message.reply('Cannot call the command upon yourself!')
    return true
  }

  // Query user's Mute record in Kiera's DB
  const mutedUserRecord = new TrackedMutedUser(
    await routed.bot.DB.get<TrackedMutedUser>('muted-users', { id: targetUser.id, active: true })
  )

  if (!mutedUserRecord._id) {
    await routed.message.reply('Could not find an active mute record for this user!')
    return true
  }

  // Update Mute record
  await routed.bot.DB.update<TrackedMutedUser>(
    'muted-users',
    { id: mutedUserRecord.id, active: true },
    {
      $set: {
        active: false,
        removedBy: routed.user.id,
        removedAt: Date.now()
      }
    },
    { atomic: true }
  )

  // Now remove the user's mute role adding back all previous roles
  await targetUser.roles.remove(muteRole)
  await targetUser.roles.add(mutedUserRecord.roles.map((r) => r.id))

  await routed.message.channel.send(
    `:mute: **UnMuted User**\nUser = \`${routed.v.o.user}\`\nReason = \`${mutedUserRecord.reason}\`\nRoles Restored = \`${mutedUserRecord.roles.map((r) => r.name).join(' ')}\``
  )
  return true
}

export async function activeMutes(routed: RouterRouted) {
  const mutedRecordsRaw = await routed.bot.DB.getMultiple<TrackedMutedUser>('muted-users', { serverID: routed.message.guild.id, active: true })
  const mutedRecords = mutedRecordsRaw.map((m) => new TrackedMutedUser(m))

  var response = `:mute: **Muted Users List**\n`
  response += '```'
  mutedRecords.forEach((m) => {
    const userOnServer = routed.message.guild.members.cache.find((u) => u.id === m.id)
    const dateFormatted = new Date(m.timestamp)
    // If still on the server
    if (userOnServer)
      response += Utils.sb(Utils.en.mod.mutedListEntryUser, {
        username: userOnServer.user.username,
        discriminator: userOnServer.user.discriminator,
        dateFormatted: dateFormatted.toUTCString(),
        reason: m.reason,
        mutedBy: Utils.User.buildUserChatAt(new TrackedUser({ username: m.mutedByUsername, discriminator: m.mutedByDiscriminator }), Utils.User.UserRefType.usernameFull)
      })
    else
      response += Utils.sb(Utils.en.mod.mutedListEntryUser, {
        username: m.username,
        discriminator: m.discriminator,
        dateFormatted: dateFormatted.toUTCString(),
        reason: m.reason,
        mutedBy: Utils.User.buildUserChatAt(new TrackedUser({ username: m.mutedByUsername, discriminator: m.mutedByDiscriminator }), Utils.User.UserRefType.usernameFull)
      })
  })
  response += '```'

  await routed.message.reply(response)
}

export async function lookupMutes(routed: RouterRouted) {
  const regex = XRegex('^((?<username>(?!@|#|:|`).*)\\#(?<discriminator>[0-9]{4,5}))$', 'i')
  const match = XRegex.exec(routed.v.o.user, regex)
  const username = match['username']
  const discriminator = match['discriminator']

  // Error in username passed
  if (!username || !discriminator) {
    await routed.message.reply('This command requires a Username & Discriminator, like this (__But with no @__) `emma#1366`')
    return true
  }

  const targetUser = routed.message.guild.members.cache.find((m) => m.user.username.toLocaleLowerCase() === username.toLocaleLowerCase() && m.user.discriminator === discriminator)
  const mutedRecordsRaw = await routed.bot.DB.getMultiple<TrackedMutedUser>('muted-users', { serverID: routed.message.guild.id, id: targetUser.id })

  // Could not find user
  if (!mutedRecordsRaw) {
    await routed.message.reply(`Could not find the requested user, make sure you're searching based off their username and not nickname.`)
    return true
  }

  // Block trying to call upon yourself
  if (targetUser.id === routed.user.id) {
    await routed.message.reply('Cannot call the command upon yourself!')
    return true
  }

  const mutedRecords = mutedRecordsRaw.map((m) => new TrackedMutedUser(m))

  var response = `:mute: **Muted User Lookup**\n`
  response += '```'
  mutedRecords.forEach((m) => {
    const dateFormatted = new Date(m.timestamp)
    // If still on the server
    if (targetUser)
      response += `${targetUser.user.username}#${targetUser.user.discriminator} (${m.active ? `Active` : 'Not-Active'})\n  ## Muted: ${dateFormatted.toUTCString()}\n  ## Reason: ${
        m.reason
      }\n\n`
    else
      response += `${m.username}#${m.discriminator} (${m.active ? `Active` : 'Not-Active'}) __(user left the server)__\n  ## Muted: ${dateFormatted.toUTCString()}\n  ## Reason: ${
        m.reason
      } ${!m.active ? `## Unmuted: ${m.removedAt}` : ``}\n\n`
  })
  response += '```'

  await routed.message.reply(response)
}
