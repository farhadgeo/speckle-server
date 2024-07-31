import { Knex } from 'knex'
import crs from 'crypto-random-string'
import { scanTableFactory } from '@/modules/core/helpers/scanTable'
import { coreLogger } from '@/modules/core/logger'

export async function up(knex: Knex): Promise<void> {
  coreLogger.info('Migration user_emails_backfill started')

  const batchSize = 1000
  const [countQuery] = await knex('users').count()
  const usersCount = parseInt(countQuery.count.toString())
  const maxLoops = usersCount / batchSize

  coreLogger.info(`Number of loops estimated: ${maxLoops}`)

  let currentIteration = 1
  for await (const rows of scanTableFactory({ db: knex })({
    tableName: 'users',
    batchSize
  })) {
    coreLogger.info(`Starting iteration ${currentIteration} with ${rows.length} rows`)
    if (rows.length) {
      await knex('user_emails')
        .insert(
          rows.map((user) => ({
            id: crs({ length: 10 }),
            userId: user.id,
            email: user.email,
            verified: user.verified,
            primary: true
          }))
        )
        .onConflict(['userId', 'email'])
        .ignore()
    }
    currentIteration++
    coreLogger.info(`Completed iteration ${currentIteration}`)

    if (currentIteration > maxLoops + 2) {
      throw new Error('Stopping migration to avoid infinite loop')
    }
  }
  coreLogger.info('Migration user_emails_backfill started')
}

export async function down(knex: Knex): Promise<void> {
  await knex('user_emails').delete()
}
