import { Resolvers } from '@/modules/core/graph/generated/graphql'
import {
  createUserEmailFactory,
  deleteUserEmailFactory,
  ensureNoPrimaryEmailForUserFactory,
  findEmailFactory,
  findEmailsByUserIdFactory,
  setPrimaryUserEmailFactory
} from '@/modules/core/repositories/userEmails'
import { db } from '@/db/knex'
import { requestNewEmailVerification } from '@/modules/emails/services/verification/request'
import { finalizeInvitedServerRegistrationFactory } from '@/modules/serverinvites/services/processing'
import {
  deleteServerOnlyInvitesFactory,
  updateAllInviteTargetsFactory
} from '@/modules/serverinvites/repositories/serverInvites'
import { validateAndCreateUserEmailFactory } from '@/modules/core/services/userEmails'

export = {
  ActiveUserMutations: {
    emailMutations: () => ({})
  },
  User: {
    async emails(parent) {
      return findEmailsByUserIdFactory({ db })({ userId: parent.id })
    }
  },
  UserEmailMutations: {
    create: async (_parent, args, ctx) => {
      const validateAndCreateUserEmail = validateAndCreateUserEmailFactory({
        createUserEmail: createUserEmailFactory({ db }),
        ensureNoPrimaryEmailForUser: ensureNoPrimaryEmailForUserFactory({ db }),
        findEmail: findEmailFactory({ db }),
        updateEmailInvites: finalizeInvitedServerRegistrationFactory({
          deleteServerOnlyInvites: deleteServerOnlyInvitesFactory({ db }),
          updateAllInviteTargets: updateAllInviteTargetsFactory({ db })
        }),
        requestNewEmailVerification
      })

      await validateAndCreateUserEmail({
        userEmail: {
          userId: ctx.userId!,
          email: args.input.email,
          primary: false
        }
      })

      return ctx.loaders.users.getUser.load(ctx.userId!)
    },
    delete: async (_parent, args, ctx) => {
      await deleteUserEmailFactory({ db })({
        userId: ctx.userId!,
        id: args.input.id
      })
      return ctx.loaders.users.getUser.load(ctx.userId!)
    },
    setPrimary: async (_parent, args, ctx) => {
      await setPrimaryUserEmailFactory({ db })({
        userId: ctx.userId!,
        id: args.input.id
      })
      return ctx.loaders.users.getUser.load(ctx.userId!)
    },
    requestNewEmailVerification: async (_parent, args) => {
      await requestNewEmailVerification(args.input.id)
      return null
    }
  }
} as Resolvers