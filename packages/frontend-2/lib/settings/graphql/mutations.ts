import { graphql } from '~~/lib/common/generated/gql'

export const settingsUpdateWorkspaceMutation = graphql(`
  mutation UpdateWorkspace($input: WorkspaceUpdateInput!) {
    workspaceMutations {
      update(input: $input) {
        description
        name
        id
      }
    }
  }
`)

export const settingsUpdateWorkspaceDomainProtection = graphql(`
  mutation UpdateWorkspaceDomainProtection($input: WorkspaceUpdateInput!) {
    workspaceMutations {
      update(input: $input) {
        domainBasedMembershipProtectionEnabled
      }
    }
  }
`)

export const deleteWorkspaceMutation = graphql(`
  mutation DeleteWorkspace($workspaceId: String!) {
    workspaceMutations {
      delete(workspaceId: $workspaceId)
    }
  }
`)

export const settingsAddWorkspaceDomainMutation = graphql(`
  mutation AddWorkspaceDomain($input: AddDomainToWorkspaceInput!) {
    workspaceMutations {
      addDomain(input: $input) {
        domains {
          id
          domain
        }
      }
    }
  }
`)

export const settingsDeleteWorkspaceDomainMutation = graphql(`
  mutation DeleteWorkspaceDomain($input: WorkspaceDomainDeleteInput!) {
    workspaceMutations {
      deleteDomain(input: $input) {
        domains {
          id
          domain
        }
      }
    }
  }
`)