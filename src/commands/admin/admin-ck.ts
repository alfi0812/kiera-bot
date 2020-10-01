import { RouterRouted, ExportRoutes } from '@/router'

export const Routes = ExportRoutes({
  type: 'message',
  category: 'ChastiKey',
  controller: forceStatsReload,
  description: 'Help.Admin.ChastiKeyRefresh.Description',
  example: '{{prefix}}admin ck stats refresh',
  name: 'admin-ck-stats-stats',
  permissions: {
    defaultEnabled: false,
    restrictedTo: [
      '715198203598864485',
            '705412678142656655',
            '448856044840550403'
    ]
  },
  validate: '/admin:string/ck:string/stats:string/refresh:string'
})

/**
 * Trigger a reload when the next task interval runs
 * @export
 * @param {RouterRouted} routed
 */
export async function forceStatsReload(routed: RouterRouted) {
  await routed.message.channel.send(routed.$render('ChastiKey.Admin.RefreshTriggered'))

  // Get Jobs queue
  const jobs = await routed.bot.Task.Agenda.jobs({})
  const chastiKeyJobs = jobs.filter((j) => j.attrs.name.startsWith('ChastiKeyAPI'))
  console.log('chastiKeyJobs', chastiKeyJobs.length)

  for (let index = 0; index < chastiKeyJobs.length; index++) {
    const job = chastiKeyJobs[index]
    await job.run()
  }

  // Report its done
  await routed.message.channel.send(routed.$render('ChastiKey.Admin.RefreshManualCompleted'))

  return true
}
