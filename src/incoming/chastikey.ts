import { Attachment } from "discord.js";
import { verifyUserRefType, buildUserQuery } from "../utils";
import { TrackedUser } from "../objects/user";
import { generateTickerURL } from "../utils/chastikey";
import { ChastiKeyTickerType } from "../objects/chastikey";
import { RouterRouted } from "../utils/router";

export async function setUsername(routed: RouterRouted) {
  const userArgType = verifyUserRefType(routed.message.author.id)
  const userQuery = buildUserQuery(routed.message.author.id, userArgType)

  // Get the user from the db in their current state
  const user = new TrackedUser(await routed.bot.Users.get(userQuery))
  // Change/Update TrackedChastiKey.Username Prop
  user.ChastiKey.username = routed.v.o.ckusername
  // Commit change to db
  const updateResult = await routed.bot.Users.update(userQuery, user)

  if (updateResult > 0) {
    await routed.message.author.send(`:white_check_mark: ChastiKey Username now set to: \`${routed.v.o.ckusername}\``)
    routed.bot.DEBUG_MSG_COMMAND(`!ck username ${routed.v.o.ckusername}`)
  }
  else {
    routed.bot.DEBUG_MSG_COMMAND(`!ck username ${routed.v.o.ckusername} -> update unsuccessful!`)
  }
}

export async function setTickerType(routed: RouterRouted) {
  const userArgType = verifyUserRefType(routed.message.author.id)
  const userQuery = buildUserQuery(routed.message.author.id, userArgType)
  const newTickerType = routed.v.o.number === 1 || routed.v.o.number === 2 ?
    routed.v.o.number === 1
      ? ChastiKeyTickerType.Keyholder
      : ChastiKeyTickerType.Lockee
    : ChastiKeyTickerType.Lockee // Fallback default = lockee

  const newTickerTypeAsString = newTickerType === ChastiKeyTickerType.Keyholder
    ? 'Keyholder'
    : 'Lockee'

  // Get the user from the db in their current state
  const user = new TrackedUser(await routed.bot.Users.get(userQuery))
  // Change/Update TrackedChastiKey.Type Prop
  user.ChastiKey.ticker.type = newTickerType
  // Commit change to db
  const updateResult = await routed.bot.Users.update(userQuery, user)

  if (updateResult > 0) {
    await routed.message.author.send(`:white_check_mark: ChastiKey Ticker type now set to: \`${newTickerTypeAsString}\``)
    routed.bot.DEBUG_MSG_COMMAND(`!ck ticker set type ${newTickerTypeAsString}`)
  }
  else {
    routed.bot.DEBUG_MSG_COMMAND(`!ck ticker set type ${newTickerTypeAsString} -> update unsuccessful!`)
  }
}

export async function getTicker(routed: RouterRouted) {
  const userArgType = verifyUserRefType(routed.message.author.id)
  const userQuery = buildUserQuery(routed.message.author.id, userArgType)
  const user = new TrackedUser(await routed.bot.Users.get(userQuery))
  const attachment = new Attachment(generateTickerURL(user.ChastiKey));
  await routed.message.channel.send(attachment);
}