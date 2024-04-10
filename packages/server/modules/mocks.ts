/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AutomateRunTriggerType,
  LimitedUser,
  Resolvers
} from '@/modules/core/graph/generated/graphql'
import { isTestEnv } from '@/modules/shared/helpers/envHelper'
import { Automate, Roles } from '@speckle/shared'
import { times } from 'lodash'
import { IMockStore, IMocks } from '@graphql-tools/mock'
import dayjs from 'dayjs'
import { BranchCommits, Branches, Commits } from '@/modules/core/dbSchema'

const getRandomModelVersion = async (offset?: number) => {
  const versionQ = Commits.knex()
    .join(BranchCommits.name, BranchCommits.col.commitId, Commits.col.id)
    .first()
  if (offset) versionQ.offset(offset)
  const version = await versionQ

  const model = await Branches.knex()
    .join(BranchCommits.name, BranchCommits.col.branchId, Branches.col.id)
    .where(BranchCommits.col.commitId, version.id)
    .first()

  return {
    model,
    version
  }
}

/**
 * Define mocking config in dev env
 * https://www.apollographql.com/docs/apollo-server/v3/testing/mocking
 */
export async function buildMocksConfig(): Promise<{
  mocks: boolean | IMocks
  mockEntireSchema: boolean
  resolvers?: Resolvers | ((store: IMockStore) => Resolvers)
}> {
  // TODO: Disable before merging!
  if (isTestEnv()) return { mocks: false, mockEntireSchema: false }

  // const isDebugEnv = isDevEnv()
  // if (!isDebugEnv) return { mocks: false, mockEntireSchema: false } // we def don't want this on in prod

  // feel free to define mocks for your dev env below
  const { faker } = await import('@faker-js/faker')

  return {
    resolvers: (store) => ({
      Query: {
        automateFunctions: (_parent, args) => {
          const count = args.limit || faker.datatype.number({ min: 4, max: 20 })

          return {
            cursor: null,
            totalCount: count,
            items: times(count, () => store.get('AutomateFunction'))
          } as any
        },
        automateFunction: (_parent, args) => {
          const id = args.id
          return store.get('AutomateFunction', { id }) as any
        }
      },
      Project: {
        automations: (_parent, args) => {
          const forceAutomations = false
          const forceNoAutomations = false

          const limit = args.limit || faker.datatype.number({ min: 4, max: 20 })
          let count
          if (forceNoAutomations) {
            count = 0
          } else {
            count = forceAutomations ? limit : faker.datatype.boolean() ? limit : 0
          }

          return {
            cursor: null,
            totalCount: count,
            items: times(count, () => store.get('Automation'))
          } as any
        },
        blob: () => {
          return store.get('BlobMetadata') as any
        }
      },
      Model: {
        automationsStatus: async () => {
          const random = faker.datatype.boolean()
          return (random ? store.get('TriggeredAutomationsStatus') : null) as any
        }
      },
      Version: {
        automationsStatus: async () => {
          const random = faker.datatype.boolean()
          return (random ? store.get('TriggeredAutomationsStatus') : null) as any
        }
      },
      Automation: {
        runs: (_parent, args) => {
          const count = args.limit || faker.datatype.number({ min: 4, max: 20 })

          return {
            cursor: null,
            totalCount: count,
            items: times(count, () => store.get('AutomateRun'))
          } as any
        }
      },
      AutomationRevision: {
        triggerDefinitions: async () => {
          const res = await Promise.all([
            getRandomModelVersion(),
            getRandomModelVersion(1)
          ])

          return res.map((i) => ({
            type: AutomateRunTriggerType.VersionCreated,
            model: i.model,
            version: i.version
          }))
        }
      },
      AutomateRun: {
        trigger: async () => {
          const { model, version } = await getRandomModelVersion()

          return {
            type: AutomateRunTriggerType.VersionCreated,
            version,
            model
          }
        }
      },
      ProjectAutomationMutations: {
        update: (_parent, args) => {
          const {
            input: { id, name }
          } = args
          const automation = store.get('Automation') as any
          return {
            ...automation,
            id,
            ...(name?.length ? { name } : {})
          }
        }
      }
    }),
    mocks: {
      BlobMetadata: () => ({
        fileName: () => faker.system.fileName(),
        fileType: () => faker.system.mimeType(),
        fileSize: () => faker.datatype.number({ min: 1, max: 1000 })
      }),
      TriggeredAutomationsStatus: () => ({
        automationRuns: () => [...new Array(faker.datatype.number({ min: 1, max: 5 }))]
      }),
      AutomationRevision: () => ({
        functions: () => [undefined] // array of 1 always,
      }),
      Automation: () => ({
        name: () => faker.company.companyName(),
        enabled: () => faker.datatype.boolean()
      }),
      AutomateFunction: () => ({
        name: () => faker.commerce.productName(),
        isFeatured: () => faker.datatype.boolean(),
        logo: () => {
          const random = faker.datatype.boolean()
          return random
            ? faker.image.imageUrl(undefined, undefined, undefined, true)
            : null
        },
        repoUrl: () =>
          'https://github.com/specklesystems/speckle-automate-code-compliance-window-safety',
        automationCount: () => faker.datatype.number({ min: 0, max: 99 }),
        description: () => {
          // Example markdown description
          return `# ${faker.commerce.productName()}\n${faker.lorem.paragraphs(
            1,
            '\n\n'
          )}\n## Features \n- ${faker.lorem.sentence()}\n - ${faker.lorem.sentence()}\n - ${faker.lorem.sentence()}`
        }
      }),
      AutomateFunctionRelease: () => ({
        versionTag: () => {
          // Fake semantic version
          return `${faker.datatype.number({ min: 0, max: 9 })}.${faker.datatype.number({
            min: 0,
            max: 9
          })}.${faker.datatype.number({ min: 0, max: 9 })}`
        },
        commitId: () => '0c259d384a4df3cce3f24667560e5124e68f202f',
        inputSchema: () => {
          // random fro 1 to 3
          const rand = faker.datatype.number({ min: 1, max: 3 })
          switch (rand) {
            case 1:
              return {
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                $id: 'https://example.com/product.schema.json',
                title: 'Product',
                description: "A product from Acme's catalog",
                type: 'object',
                properties: {
                  name: {
                    desciption: 'Random name',
                    type: 'string'
                  },
                  productId: {
                    description: 'The unique identifier for a product',
                    type: 'integer'
                  }
                },
                required: ['productId']
              }
            default:
              return null
          }
        }
      }),
      AutomateRun: () => ({
        reason: () => faker.lorem.sentence(),
        id: () => faker.random.alphaNumeric(20),
        createdAt: () =>
          faker.date
            .recent(undefined, dayjs().subtract(1, 'day').toDate())
            .toISOString(),
        updatedAt: () => faker.date.recent().toISOString(),
        functionRuns: () => [...new Array(faker.datatype.number({ min: 1, max: 5 }))],
        statusMessage: () => faker.lorem.sentence()
      }),
      AutomateFunctionRun: () => ({
        contextView: () => `/`,
        elapsed: () => faker.datatype.number({ min: 0, max: 600 }),
        statusMessage: () => faker.lorem.sentence(),
        results: (): Automate.AutomateTypes.ResultsSchema => {
          return {
            version: Automate.AutomateTypes.RESULTS_SCHEMA_VERSION,
            values: {
              objectResults: [],
              blobIds: [...new Array(faker.datatype.number({ min: 0, max: 5 }))].map(
                () => faker.datatype.uuid()
              )
            }
          }
        }
      }),
      LimitedUser: () =>
        ({
          id: faker.datatype.uuid(),
          name: faker.name.findName(),
          avatar: faker.image.avatar(),
          bio: faker.lorem.sentence(),
          company: faker.company.companyName(),
          verified: faker.datatype.boolean(),
          role: Roles.Server.User
        } as LimitedUser),
      JSONObject: () => ({}),
      ID: () => faker.datatype.uuid(),
      DateTime: () => faker.date.recent().toISOString(),
      Model: () => ({
        id: () => faker.datatype.uuid(),
        name: () => faker.commerce.productName(),
        previewUrl: () => faker.image.imageUrl()
      }),
      Version: () => ({
        id: () => faker.random.alphaNumeric(10)
      })
    },
    mockEntireSchema: false
  }
}