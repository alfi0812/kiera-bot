import { RouterStats } from '@/router'
import { UserData } from 'chastikey.js/app/objects'

export function searchResults(found: Array<UserData>, routerStats: RouterStats, cachedTimestamp: number) {
  var description = ``

  found.forEach(ckUser => {
    description += `${ckUser.isVerified ? '<:verified:748870375139573840> ' : ''}${ckUser.username}\n`
  })

  return {
    embed: {
      title: `Search Results`,
      description: description,
      color: 14553782,
      timestamp: cachedTimestamp,
      footer: {
        icon_url: 'https://cdn.discordapp.com/app-icons/526039977247899649/41251d23f9bea07f51e895bc3c5c0b6d.png',
        text: `Runtime ${routerStats.performance}ms :: Requested By ${routerStats.user} :: Cached by Kiera`
      }
    }
  }
}
