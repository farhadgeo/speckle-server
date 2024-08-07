import { beforeEachContext, truncateTables } from '@/test/hooks'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { createUser } from '@/modules/core/services/users'
import {
  createRandomEmail,
  createRandomPassword
} from '@/modules/core/helpers/testHelpers'
import { createUserEmailFactory } from '@/modules/core/repositories/userEmails'
import { db } from '@/db/knex'
import { UserEmails, Users } from '@/modules/core/dbSchema'
import { UserEmail } from '@/modules/core/domain/userEmails/types'
import { testApolloServer } from '@/test/graphqlHelper'
import {
  CreateUserEmailDocument,
  DeleteUserEmailDocument,
  SetPrimaryUserEmailDocument
} from '@/test/graphql/generated/graphql'

describe('User emails graphql @core', () => {
  before(async () => {
    await beforeEachContext()
  })
  beforeEach(async () => {
    await truncateTables([Users.name, UserEmails.name])
  })

  describe('createUserEmail mutation', () => {
    it('should create new email for user', async () => {
      const firstEmail = createRandomEmail()
      const userId = await createUser({
        name: 'emails user',
        email: firstEmail,
        password: createRandomPassword()
      })
      const secondEmail = createRandomEmail()

      const apollo = await testApolloServer({ authUserId: userId })
      const res = await apollo.execute(CreateUserEmailDocument, {
        input: { email: secondEmail }
      })

      expect(res).to.not.haveGraphQLErrors()
      const userEmail = await db<UserEmail>(UserEmails.name)
        .where({
          userId,
          email: secondEmail
        })
        .first()

      expect(userEmail).to.be.ok
      expect(userEmail!.email).to.eq(secondEmail)
      expect(userEmail!.userId).to.eq(userId)

      const createRes = res.data?.activeUserMutations.emailMutations.create
      expect(createRes).to.be.ok
      expect(createRes?.emails.length).to.eq(2)
      expect((createRes?.emails || []).map((e) => e.email)).to.deep.equalInAnyOrder([
        firstEmail,
        secondEmail
      ])
    })
  })

  describe('deleteUserEmail mutation', () => {
    it('should delete email for user', async () => {
      const firstEmail = createRandomEmail()
      const userId = await createUser({
        name: 'emails user',
        email: firstEmail,
        password: createRandomPassword()
      })
      const email = createRandomEmail()

      const id = await createUserEmailFactory({ db })({
        userEmail: {
          email,
          userId,
          primary: false
        }
      })

      const apollo = await testApolloServer({ authUserId: userId })
      const res = await apollo.execute(DeleteUserEmailDocument, { input: { id } })

      expect(res).to.not.haveGraphQLErrors()
      expect(res.data?.activeUserMutations.emailMutations.delete.id).to.be.ok
      expect(
        res.data?.activeUserMutations.emailMutations.delete.emails.map((e) => e.email)
      ).deep.equal([firstEmail])
    })
  })

  describe('setPrimaryUserEmail mutation', () => {
    it('should set primary email for user', async () => {
      const userId = await createUser({
        name: 'emails user',
        email: createRandomEmail(),
        password: createRandomPassword()
      })
      const email = createRandomEmail()

      const id = await createUserEmailFactory({ db })({
        userEmail: {
          email,
          userId,
          primary: false
        }
      })

      const apollo = await testApolloServer({ authUserId: userId })
      const res = await apollo.execute(SetPrimaryUserEmailDocument, { input: { id } })

      expect(res).to.not.haveGraphQLErrors()
      expect(res.data?.activeUserMutations.emailMutations.setPrimary.id).to.be.ok
      expect(
        res.data?.activeUserMutations.emailMutations.setPrimary.emails.find(
          (e) => !!e.primary
        )?.email
      ).to.eq(email)
    })
  })
})